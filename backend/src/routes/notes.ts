import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/papers/:paperId/notes
router.get('/papers/:paperId/notes', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query(
      'SELECT * FROM notes WHERE paper_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [req.params.paperId, user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/papers/:paperId/notes
router.post('/papers/:paperId/notes', [body('content').notEmpty()], async (req: Request, res: Response) => {
  const user = req.user as any;
  const content = sanitizeHtml(req.body.content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'code', 'pre']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'] },
  });
  try {
    // Verify paper belongs to user
    const paperCheck = await query('SELECT id FROM papers WHERE id = $1 AND user_id = $2', [req.params.paperId, user.id]);
    if (!paperCheck.rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });

    const { rows } = await query(
      'INSERT INTO notes (paper_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.paperId, user.id, content]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// PUT /api/notes/:id
router.put('/:id', [body('content').notEmpty()], async (req: Request, res: Response) => {
  const user = req.user as any;
  const content = sanitizeHtml(req.body.content, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1','h2','h3','code','pre']) });
  try {
    const { rows } = await query(
      'UPDATE notes SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, req.params.id, user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rowCount } = await query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
