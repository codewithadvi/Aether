import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// POST /api/export — generate export
router.post('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { format = 'json', collection_id } = req.body;

  try {
    const paperFilter = collection_id
      ? 'JOIN collection_papers cp ON cp.paper_id = p.id WHERE p.user_id = $1 AND cp.collection_id = $2'
      : 'WHERE p.user_id = $1';
    const params = collection_id ? [user.id, collection_id] : [user.id];

    const [papersRes, notesRes, insightsRes, ideasRes, collectionsRes] = await Promise.all([
      query(`SELECT p.* FROM papers p ${paperFilter}`, params),
      query('SELECT * FROM notes WHERE user_id = $1', [user.id]),
      query('SELECT * FROM insights WHERE user_id = $1', [user.id]),
      query('SELECT * FROM ideas WHERE user_id = $1', [user.id]),
      query('SELECT * FROM collections WHERE user_id = $1', [user.id]),
    ]);

    if (format === 'csv') {
      const papers = papersRes.rows;
      const headers = ['id','title','authors','doi','url','field','venue','publication_date','citation_count','read_at','created_at'];
      const csv = [
        headers.join(','),
        ...papers.map(p => headers.map(h => {
          const v = p[h];
          if (Array.isArray(v)) return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
          if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
          return v ?? '';
        }).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="papers.csv"');
      return res.send(csv);
    }

    if (format === 'bibtex') {
      const papers = papersRes.rows;
      const bibtex = papers.map(p => {
        const authors = Array.isArray(p.authors) ? p.authors : JSON.parse(p.authors || '[]');
        const authorStr = authors.join(' and ');
        const year = p.publication_date ? new Date(p.publication_date).getFullYear() : '';
        const key = `${authors[0]?.split(' ').pop() || 'unknown'}${year}${p.title.split(' ')[0].toLowerCase()}`;
        
        return `@article{${key.replace(/[^a-zA-Z0-9]/g, '')},
  title = {${p.title}},
  author = {${authorStr}},
  year = {${year}},
  journal = {${p.venue || ''}},
  doi = {${p.doi || ''}},
  url = {${p.url || ''}}
}`;
      }).join('\n\n');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="papers.bib"');
      return res.send(bibtex);
    }

    // JSON export
    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      papers: papersRes.rows,
      notes: notesRes.rows,
      insights: insightsRes.rows,
      ideas: ideasRes.rows,
      collections: collectionsRes.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="research_tracker_export.json"');
    res.json(exportData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
