import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

let schemaChecked = false;
let supportsCollaborators = false;
let supportsShareColumns = false;

async function ensureCollectionsSchemaCapabilities() {
  if (schemaChecked) return;

  try {
    const [collabTableCheck, shareColsCheck] = await Promise.all([
      query(`SELECT to_regclass('public.collection_collaborators') AS table_name`),
      query(`
        SELECT COUNT(*)::int AS count
        FROM information_schema.columns
        WHERE table_name = 'collections'
          AND column_name IN ('share_enabled', 'share_token')
      `),
    ]);

    supportsCollaborators = !!collabTableCheck.rows[0]?.table_name;
    supportsShareColumns = (shareColsCheck.rows[0]?.count || 0) >= 2;
  } catch {
    supportsCollaborators = false;
    supportsShareColumns = false;
  } finally {
    schemaChecked = true;
  }
}

async function getCollectionAccess(collectionId: string, userId: string) {
  await ensureCollectionsSchemaCapabilities();

  const { rows } = supportsCollaborators
    ? await query(
        `
          SELECT
            c.*,
            (c.user_id = $2) AS owned_by_me,
            cc.role AS collaborator_role
          FROM collections c
          LEFT JOIN collection_collaborators cc
            ON cc.collection_id = c.id AND cc.user_id = $2
          WHERE c.id = $1
          LIMIT 1
        `,
        [collectionId, userId]
      )
    : await query(
        `
          SELECT
            c.*,
            (c.user_id = $2) AS owned_by_me,
            NULL::text AS collaborator_role
          FROM collections c
          WHERE c.id = $1
          LIMIT 1
        `,
        [collectionId, userId]
      );

  const row = rows[0];
  if (!row) return null;

  const role = row.owned_by_me ? 'owner' : (row.collaborator_role || null);
  return {
    ...row,
    share_enabled: supportsShareColumns ? !!row.share_enabled : false,
    share_token: supportsShareColumns ? row.share_token : null,
    access_role: role,
    can_view: !!role,
    can_edit: role === 'owner' || role === 'editor',
    can_manage_sharing: role === 'owner',
  };
}

router.get('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureCollectionsSchemaCapabilities();

    const { rows } = supportsCollaborators
      ? await query(`
          SELECT
            c.*,
            COUNT(DISTINCT cp.paper_id)::int AS paper_count,
            (c.user_id = $1) AS owned_by_me,
            COALESCE(cc.role, 'owner') AS access_role
          FROM collections c
          LEFT JOIN collection_papers cp ON cp.collection_id = c.id
          LEFT JOIN collection_collaborators cc ON cc.collection_id = c.id AND cc.user_id = $1
          WHERE c.user_id = $1 OR cc.user_id = $1
          GROUP BY c.id, cc.role
          ORDER BY c.created_at DESC
        `, [user.id])
      : await query(`
          SELECT
            c.*,
            COUNT(DISTINCT cp.paper_id)::int AS paper_count,
            true AS owned_by_me,
            'owner'::text AS access_role
          FROM collections c
          LEFT JOIN collection_papers cp ON cp.collection_id = c.id
          WHERE c.user_id = $1
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `, [user.id]);

    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.post('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name required' } });
  try {
    const { rows } = await query('INSERT INTO collections (user_id, name, description) VALUES ($1, $2, $3) RETURNING *', [user.id, name, description]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/shared/:token', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureCollectionsSchemaCapabilities();
    if (!supportsShareColumns) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Shared collections are not enabled yet' } });
    }

    const { rows } = await query(
      `
        SELECT c.*,
          (c.user_id = $2) AS owned_by_me,
          cc.role AS collaborator_role
        FROM collections c
        LEFT JOIN collection_collaborators cc ON cc.collection_id = c.id AND cc.user_id = $2
        WHERE c.share_enabled = true AND c.share_token = $1
        LIMIT 1
      `,
      [req.params.token, user.id]
    );

    const collection = rows[0];
    if (!collection) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Shared collection not found' } });
    }

    const role = collection.owned_by_me ? 'owner' : (collection.collaborator_role || 'viewer');
    const papers = await query(
      `
        SELECT
          p.*,
          cp.added_at,
          cp.added_by,
          u.name AS added_by_name,
          u.email AS added_by_email
        FROM papers p
        JOIN collection_papers cp ON cp.paper_id = p.id
        LEFT JOIN users u ON u.id = cp.added_by
        WHERE cp.collection_id = $1
        ORDER BY cp.added_at DESC
      `,
      [collection.id]
    );

    res.json({
      success: true,
      data: {
        ...collection,
        access_role: role,
        can_view: true,
        can_edit: role === 'owner' || role === 'editor',
        can_manage_sharing: role === 'owner',
        papers: papers.rows,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_view) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const papers = await query(`
      SELECT
        p.*,
        cp.added_at,
        cp.added_by,
        u.name AS added_by_name,
        u.email AS added_by_email
      FROM papers p
      JOIN collection_papers cp ON cp.paper_id = p.id
      LEFT JOIN users u ON u.id = cp.added_by
      WHERE cp.collection_id = $1
      ORDER BY cp.added_at DESC
    `, [req.params.id]);
    res.json({
      success: true,
      data: {
        ...access,
        papers: papers.rows,
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { name, description } = req.body;
  try {
    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_manage_sharing) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can update this collection' } });
    }

    const { rows } = await query(
      'UPDATE collections SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, description, req.params.id, user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rowCount } = await query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.post('/:id/papers', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { paper_id } = req.body;
  try {
    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_edit) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit access to this collection' } });
    }
    await query(
      'INSERT INTO collection_papers (collection_id, paper_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, paper_id, user.id]
    );
    res.json({ success: true, data: { message: 'Paper added to collection' } });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.delete('/:id/papers/:paperId', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_edit) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No edit access to this collection' } });
    }
    await query('DELETE FROM collection_papers WHERE collection_id = $1 AND paper_id = $2', [req.params.id, req.params.paperId]);
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_view) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const { rows } = await query(`
      SELECT 
        COUNT(DISTINCT p.id)::int AS paper_count,
        COUNT(DISTINCT p.field)::int AS field_count,
        COUNT(DISTINCT elem)::int AS author_count
      FROM collections c
      JOIN collection_papers cp ON cp.collection_id = c.id
      JOIN papers p ON p.id = cp.paper_id,
      jsonb_array_elements_text(p.authors) AS elem
      WHERE c.id = $1
    `, [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/:id/collaborators', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureCollectionsSchemaCapabilities();
    if (!supportsCollaborators) {
      return res.json({ success: true, data: [] });
    }

    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_view) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const { rows } = await query(
      `
        SELECT
          u.id,
          u.email,
          u.name,
          cc.role,
          cc.created_at
        FROM collection_collaborators cc
        JOIN users u ON u.id = cc.user_id
        WHERE cc.collection_id = $1
        ORDER BY cc.created_at ASC
      `,
      [req.params.id]
    );

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/:id/collaborators', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Collaborator email is required' } });
  }

  const normalizedRole = role === 'viewer' ? 'viewer' : 'editor';

  try {
    await ensureCollectionsSchemaCapabilities();
    if (!supportsCollaborators) {
      return res.status(501).json({ success: false, error: { code: 'FEATURE_NOT_AVAILABLE', message: 'Collaborators require latest database migration' } });
    }

    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_manage_sharing) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can manage collaborators' } });
    }

    const userLookup = await query('SELECT id, email, name FROM users WHERE lower(email) = lower($1)', [email]);
    const collaborator = userLookup.rows[0];

    if (!collaborator) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'No user found with that email' } });
    }

    if (collaborator.id === user.id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Owner is already a collaborator' } });
    }

    const { rows } = await query(
      `
        INSERT INTO collection_collaborators (collection_id, user_id, role, invited_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (collection_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
        RETURNING collection_id, user_id, role, created_at
      `,
      [req.params.id, collaborator.id, normalizedRole, user.id]
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        email: collaborator.email,
        name: collaborator.name,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.delete('/:id/collaborators/:collaboratorId', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureCollectionsSchemaCapabilities();
    if (!supportsCollaborators) {
      return res.status(501).json({ success: false, error: { code: 'FEATURE_NOT_AVAILABLE', message: 'Collaborators require latest database migration' } });
    }

    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_manage_sharing) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can manage collaborators' } });
    }

    await query(
      'DELETE FROM collection_collaborators WHERE collection_id = $1 AND user_id = $2',
      [req.params.id, req.params.collaboratorId]
    );

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/:id/share-link', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { enabled } = req.body;

  try {
    await ensureCollectionsSchemaCapabilities();
    if (!supportsShareColumns) {
      return res.status(501).json({ success: false, error: { code: 'FEATURE_NOT_AVAILABLE', message: 'Share links require latest database migration' } });
    }

    const access = await getCollectionAccess(req.params.id, user.id);
    if (!access || !access.can_manage_sharing) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can manage sharing' } });
    }

    const shareEnabled = enabled !== false;
    const token = access.share_token || crypto.randomBytes(24).toString('hex');

    const { rows } = await query(
      `
        UPDATE collections
        SET share_enabled = $1,
            share_token = CASE WHEN $1 THEN COALESCE(share_token, $2) ELSE share_token END
        WHERE id = $3 AND user_id = $4
        RETURNING id, share_enabled, share_token
      `,
      [shareEnabled, token, req.params.id, user.id]
    );

    const updated = rows[0];
    res.json({
      success: true,
      data: {
        ...updated,
        share_url: updated.share_enabled ? `/collections/shared/${updated.share_token}` : null,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
