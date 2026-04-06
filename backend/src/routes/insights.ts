import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { checkAndAwardBadges } from './papers';

const router = Router();
router.use(authenticate);

const INSIGHT_CATEGORIES = ['general','novel_methodology','surprising_result','contradicts_prior_work','practical_application','future_work','limitation'];

router.get('/papers/:paperId/insights', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query('SELECT * FROM insights WHERE paper_id = $1 AND user_id = $2 ORDER BY created_at DESC', [req.params.paperId, user.id]);
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.post('/papers/:paperId/insights', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { content, category = 'general' } = req.body;
  if (!content) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Content is required' } });
  const cat = INSIGHT_CATEGORIES.includes(category) ? category : 'general';
  try {
    const paperCheck = await query('SELECT id FROM papers WHERE id = $1 AND user_id = $2', [req.params.paperId, user.id]);
    if (!paperCheck.rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    const { rows } = await query('INSERT INTO insights (paper_id, user_id, content, category) VALUES ($1, $2, $3, $4) RETURNING *', [req.params.paperId, user.id, content, cat]);
    checkAndAwardBadges(user.id).catch(console.error);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { content, category } = req.body;
  try {
    const { rows } = await query('UPDATE insights SET content = COALESCE($1, content), category = COALESCE($2, category) WHERE id = $3 AND user_id = $4 RETURNING *', [content, category, req.params.id, user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Insight not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rowCount } = await query('DELETE FROM insights WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Insight not found' } });
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/all', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { category } = req.query;
  try {
    let q = 'SELECT i.*, p.title AS paper_title FROM insights i JOIN papers p ON p.id = i.paper_id WHERE i.user_id = $1';
    const params: any[] = [user.id];
    if (category) { params.push(category); q += ` AND i.category = $${params.length}`; }
    q += ' ORDER BY i.created_at DESC LIMIT 100';
    const { rows } = await query(q, params);
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

export default router;
