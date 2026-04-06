import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
const STATUSES = ['brainstorm','in_progress','published','abandoned'];

router.get('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { status } = req.query;
  try {
    let q = `SELECT i.*, json_agg(DISTINCT jsonb_build_object('id', p.id, 'title', p.title, 'authors', p.authors)) FILTER (WHERE p.id IS NOT NULL) AS referenced_papers
      FROM ideas i LEFT JOIN idea_paper_refs ipr ON ipr.idea_id = i.id LEFT JOIN papers p ON p.id = ipr.paper_id
      WHERE i.user_id = $1`;
    const params: any[] = [user.id];
    if (status) { params.push(status); q += ` AND i.status = $${params.length}`; }
    q += ' GROUP BY i.id ORDER BY i.created_at DESC';
    const { rows } = await query(q, params);
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.post('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, description, status = 'brainstorm', paper_ids = [] } = req.body;
  if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title required' } });
  const st = STATUSES.includes(status) ? status : 'brainstorm';
  try {
    const { rows } = await query('INSERT INTO ideas (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING *', [user.id, title, description, st]);
    const idea = rows[0];
    for (const paperId of paper_ids) {
      await query('INSERT INTO idea_paper_refs (idea_id, paper_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [idea.id, paperId]).catch(() => {});
    }
    res.status(201).json({ success: true, data: idea });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query(`
      SELECT i.*, json_agg(DISTINCT jsonb_build_object('id', p.id, 'title', p.title, 'authors', p.authors, 'venue', p.venue)) FILTER (WHERE p.id IS NOT NULL) AS referenced_papers
      FROM ideas i LEFT JOIN idea_paper_refs ipr ON ipr.idea_id = i.id LEFT JOIN papers p ON p.id = ipr.paper_id
      WHERE i.id = $1 AND i.user_id = $2 GROUP BY i.id
    `, [req.params.id, user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Idea not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, description, status } = req.body;
  const st = status && STATUSES.includes(status) ? status : undefined;
  try {
    const { rows } = await query(
      'UPDATE ideas SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status) WHERE id = $4 AND user_id = $5 RETURNING *',
      [title, description, st, req.params.id, user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Idea not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rowCount } = await query('DELETE FROM ideas WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Idea not found' } });
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.post('/:id/papers', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { paper_id } = req.body;
  try {
    const ideaCheck = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!ideaCheck.rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Idea not found' } });
    await query('INSERT INTO idea_paper_refs (idea_id, paper_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, paper_id]);
    res.json({ success: true, data: { message: 'Paper linked to idea' } });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.delete('/:id/papers/:paperId', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await query('DELETE FROM idea_paper_refs WHERE idea_id = $1 AND paper_id = $2', [req.params.id, req.params.paperId]);
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

export default router;
