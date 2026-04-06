import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/search?q=...&field=...&author=...&year=...&sortBy=...
router.get('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { q, field, author, year_from, year_to, sortBy = 'relevance', page = '1', limit = '20' } = req.query;

  if (!q) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Query (q) is required' } });

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  try {
    const params: any[] = [user.id, `%${q}%`];
    let whereExtras = '';

    if (field) { params.push(field); whereExtras += ` AND p.field = $${params.length}`; }
    if (author) { params.push(`%${author}%`); whereExtras += ` AND p.authors::text ILIKE $${params.length}`; }
    if (year_from) { params.push(`${year_from}-01-01`); whereExtras += ` AND p.publication_date >= $${params.length}`; }
    if (year_to) { params.push(`${year_to}-12-31`); whereExtras += ` AND p.publication_date <= $${params.length}`; }

    const orderMap: Record<string, string> = {
      relevance: "ts_rank(to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.abstract,'')), plainto_tsquery('english', $2)) DESC",
      date_added: 'p.created_at DESC',
      publication_date: 'p.publication_date DESC NULLS LAST',
      citation_count: 'p.citation_count DESC',
    };
    const orderBy = orderMap[sortBy as string] || orderMap.relevance;

    const searchSQL = `
      SELECT p.id, p.title, p.authors, p.abstract, p.doi, p.url,
        p.publication_date, p.venue, p.field, p.citation_count, p.read_at, p.created_at,
        ts_rank(to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.abstract,'')), plainto_tsquery('english', $2)) AS rank
      FROM papers p
      WHERE p.user_id = $1
        AND (
          p.title ILIKE $2
          OR p.abstract ILIKE $2
          OR p.authors::text ILIKE $2
          OR to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.abstract,'')) @@ plainto_tsquery('english', $2)
        )
        ${whereExtras}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limitNum, offset);

    const { rows } = await query(searchSQL, params);

    // Also search notes
    const noteParams = [user.id, `%${q}%`];
    const noteResults = await query(
      `SELECT n.*, p.title AS paper_title FROM notes n JOIN papers p ON p.id = n.paper_id
       WHERE n.user_id = $1 AND n.content ILIKE $2 LIMIT 10`,
      noteParams
    );

    res.json({
      success: true,
      data: {
        papers: rows,
        notes: noteResults.rows,
      },
      pagination: { page: pageNum, limit: limitNum }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/search/saved
router.post('/saved', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { name, query: searchQuery, filters } = req.body;
  if (!name || !searchQuery) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and query are required' } });
  try {
    const { rows } = await query(
      'INSERT INTO saved_searches (user_id, name, query, filters) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.id, name, searchQuery, JSON.stringify(filters || {})]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

// GET /api/search/saved
router.get('/saved', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query('SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

// DELETE /api/search/saved/:id
router.delete('/saved/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await query('DELETE FROM saved_searches WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

export default router;
