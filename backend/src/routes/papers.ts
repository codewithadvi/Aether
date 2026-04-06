import { Router, Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { fetchFromCrossref, fetchFromSemanticScholar } from '../services/metadataService';
import { updatePaperEmbedding, findSimilarPapers } from '../services/vectorService';

const router = Router();
router.use(authenticate);

// GET /api/papers — list user's papers
router.get('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy as string || 'created_at';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const field = req.query.field as string;
  const author = req.query.author as string;

  const validSorts: Record<string,string> = {
    created_at: 'p.created_at', read_at: 'p.read_at',
    title: 'p.title', citation_count: 'p.citation_count',
  };
  const orderCol = validSorts[sortBy] || 'p.created_at';

  try {
    let whereClause = 'WHERE p.user_id = $1';
    const params: any[] = [user.id];

    if (field) { params.push(field); whereClause += ` AND p.field = $${params.length}`; }
    if (author) { params.push(`%${author}%`); whereClause += ` AND p.authors::text ILIKE $${params.length}`; }

    const countRes = await query(`SELECT COUNT(*) FROM papers p ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT p.id, p.title, p.authors, p.abstract, p.doi, p.url, p.external_id,
        p.publication_date, p.venue, p.field, p.citation_count, p.read_at,
        p.created_at, p.updated_at, p.methodology,
        COUNT(DISTINCT n.id)::int AS note_count,
        COUNT(DISTINCT i.id)::int AS insight_count
      FROM papers p
      LEFT JOIN notes n ON n.paper_id = p.id
      LEFT JOIN insights i ON i.paper_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderCol} ${sortDir}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/papers — add a paper
router.post('/', [
  body('title').optional().trim(),
  body('doi').optional().trim(),
  body('url').optional().trim(),
], async (req: Request, res: Response) => {
  const user = req.user as any;
  let { title, doi, url, authors, abstract, publication_date, venue, field, citation_count } = req.body;

  try {
    // Auto-fetch metadata from Semantic Scholar first (it's our primary robust graph), then Crossref
    let metadataFound = false;
    let foundDoi = null;

    if (doi || title) {
      const cleanDoi = doi ? doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim() : null;
      const ssMeta = await fetchFromSemanticScholar(cleanDoi || undefined, title || undefined);
      if (ssMeta && ssMeta.title) {
        title = title || ssMeta.title;
        authors = authors?.length ? authors : ssMeta.authors;
        abstract = abstract || ssMeta.abstract;
        publication_date = publication_date || (ssMeta.year ? `${ssMeta.year}-01-01` : null);
        venue = venue || ssMeta.venue;
        citation_count = citation_count ?? ssMeta.citationCount;
        url = url || ssMeta.url;
        req.body.external_id = req.body.external_id || ssMeta.external_id;
        metadataFound = true;
        // Check if SS provided a DOI we didn't have
        if (!doi && ssMeta.doi) foundDoi = ssMeta.doi;
      }
      
      if (!metadataFound && cleanDoi) {
        const crossref = await fetchFromCrossref(cleanDoi);
        if (crossref) {
          title = title || crossref.title;
          authors = authors?.length ? authors : crossref.authors;
          abstract = abstract || crossref.abstract;
          publication_date = publication_date || crossref.publication_date;
          venue = venue || crossref.venue;
          citation_count = citation_count ?? crossref.citation_count;
          url = url || crossref.url;
          if (!doi && crossref.doi) foundDoi = crossref.doi;
        }
      }
    }

    if (!title) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required' } });
    }

    // Final duplicate detection with resolved DOI
    const finalDoi = doi || foundDoi;
    if (finalDoi) {
      const dup = await query('SELECT id FROM papers WHERE user_id = $1 AND doi = $2', [user.id, finalDoi]);
      if (dup.rows[0]) {
        return res.status(409).json({ 
          success: false, 
          error: { 
            code: 'DUPLICATE_RESOURCE', 
            message: 'This manuscript is already cataloged in your archive.', 
            data: { existing_id: dup.rows[0].id } 
          } 
        });
      }
    }

    // Auto-classify field
    const detectedField = field || detectField(title, abstract, (authors || []).join(' '));

    if (!publication_date || publication_date.trim() === '') publication_date = null;

    const { rows } = await query(`
      INSERT INTO papers (user_id, title, authors, abstract, doi, url, publication_date, venue, field, citation_count, external_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [user.id, title, JSON.stringify(authors || []), abstract, finalDoi, url,
        publication_date, venue, detectedField, citation_count || 0, req.body.external_id || null]);

    const paper = rows[0];

    // Async: compute embedding, fetch citations, discover connections
    updatePaperEmbedding(paper.id).catch(console.error);
    if (finalDoi || title) {
      fetchAndStoreCitations(paper.id, finalDoi, title, user.id).catch(console.error);
    }
    // Update user's total_papers_read
    await query('UPDATE users SET total_papers_read = total_papers_read + 1 WHERE id = $1', [user.id]);
    // Check for badge achievements
    checkAndAwardBadges(user.id).catch(console.error);

    res.status(201).json({ success: true, data: paper });
  } catch (err: any) {
    if (err.code === '23505') { // Postgres unique constraint violation
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RESOURCE', message: 'This manuscript is already cataloged.' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// GET /api/papers/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query(`
      SELECT p.*,
        json_agg(DISTINCT n.*) FILTER (WHERE n.id IS NOT NULL) AS notes,
        json_agg(DISTINCT i.*) FILTER (WHERE i.id IS NOT NULL) AS insights
      FROM papers p
      LEFT JOIN notes n ON n.paper_id = p.id
      LEFT JOIN insights i ON i.paper_id = p.id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id
    `, [req.params.id, user.id]);

    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// PUT /api/papers/:id
router.put('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, authors, abstract, field, venue, url, citation_count } = req.body;
  try {
    const { rows } = await query(`
      UPDATE papers SET
        title = COALESCE($1, title),
        authors = COALESCE($2, authors),
        abstract = COALESCE($3, abstract),
        field = COALESCE($4, field),
        venue = COALESCE($5, venue),
        url = COALESCE($6, url),
        citation_count = COALESCE($7, citation_count)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [title, authors ? JSON.stringify(authors) : null, abstract, field, venue, url, citation_count, req.params.id, user.id]);

    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });

    // Recompute embedding
    updatePaperEmbedding(rows[0].id).catch(console.error);

    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// PATCH /api/papers/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, authors, abstract, field, venue, url, citation_count, methodology } = req.body;
  
  try {
    const { rows } = await query(`
      UPDATE papers SET
        title = COALESCE($1, title),
        authors = COALESCE($2, authors),
        abstract = COALESCE($3, abstract),
        field = COALESCE($4, field),
        venue = COALESCE($5, venue),
        url = COALESCE($6, url),
        citation_count = COALESCE($7, citation_count),
        methodology = COALESCE($8, methodology)
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [title, authors ? JSON.stringify(authors) : null, abstract, field, venue, url, citation_count, methodology ? JSON.stringify(methodology) : null, req.params.id, user.id]);

    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});


// DELETE /api/papers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rowCount } = await query('DELETE FROM papers WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    await query('UPDATE users SET total_papers_read = GREATEST(0, total_papers_read - 1) WHERE id = $1', [user.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// GET /api/papers/:id/connections — semantic similarity via pgvector
router.get('/:id/connections', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const similar = await findSimilarPapers(req.params.id, user.id, 10);
    const connections = similar
      .filter(s => s.similarity_score > 0.3)
      .map(s => ({ ...s, confidence_score: Math.round(s.similarity_score * 100) }));
    res.json({ success: true, data: connections });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// GET /api/papers/:id/citations
router.get('/:id/citations', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    // Return both directions (who we cite and who cites us)
    const { rows } = await query(`
      (SELECT c.id, 'reference' as type,
        COALESCE(p.title, c.external_title) AS cited_title, 
        COALESCE(p.doi, c.external_doi) AS cited_doi,
        p.authors AS cited_authors,
        c.created_at
      FROM citations c
      LEFT JOIN papers p ON p.id = c.cited_paper_id
      WHERE c.citing_paper_id = $1)
      UNION ALL
      (SELECT c.id, 'citation' as type,
        COALESCE(p.title, c.external_title) AS cited_title, 
        COALESCE(p.doi, c.external_doi) AS cited_doi,
        p.authors AS cited_authors,
        c.created_at
      FROM citations c
      LEFT JOIN papers p ON p.id = c.citing_paper_id
      WHERE c.cited_paper_id = $1)
      ORDER BY created_at DESC
      LIMIT 100
    `, [req.params.id]);
    
    // Format them for the frontend
    const formatted = rows.map(r => ({
      ...r,
      title: r.cited_title,
      doi: r.cited_doi,
      authors: r.cited_authors || [],
      type: r.type
    }));
    
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/papers/:id/sync
router.post('/:id/sync', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query('SELECT doi, title FROM papers WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    await fetchAndStoreCitations(req.params.id, rows[0].doi, rows[0].title, user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/papers/:id/recommendations
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const similar = await findSimilarPapers(req.params.id, user.id, 5);
    res.json({ success: true, data: similar.map(s => ({ ...s, score: Math.round(s.similarity_score * 100) })) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// Helper: simple keyword-based field classification
function detectField(title: string, abstract: string, authors: string): string {
  const text = `${title} ${abstract}`.toLowerCase();
  const fields: [string, string[]][] = [
    ['Machine Learning', ['machine learning', 'deep learning', 'neural network', 'transformer', 'bert', 'gpt', 'reinforcement learning', 'gradient', 'backpropagation']],
    ['Computer Vision', ['image recognition', 'object detection', 'convolutional', 'vision', 'segmentation', 'yolo', 'resnet']],
    ['NLP', ['natural language', 'text classification', 'sentiment', 'named entity', 'language model', 'word embedding']],
    ['Systems', ['distributed system', 'operating system', 'database', 'network', 'cloud computing', 'kubernetes']],
    ['Biology', ['gene', 'protein', 'dna', 'rna', 'cell', 'organism', 'genome', 'biological']],
    ['Physics', ['quantum', 'particle', 'relativity', 'thermodynamics', 'photon', 'electron']],
    ['Economics', ['market', 'economic', 'gdp', 'inflation', 'monetary', 'fiscal']],
    ['Mathematics', ['theorem', 'proof', 'algebraic', 'topology', 'manifold', 'differential equation']],
    ['Medicine', ['clinical', 'patient', 'treatment', 'disease', 'drug', 'hospital', 'medical']],
    ['Computer Science', ['algorithm', 'complexity', 'graph', 'programming', 'software', 'compiler']],
  ];

  let best = 'General';
  let bestScore = 0;
  for (const [fieldName, keywords] of fields) {
    const score = keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = fieldName; }
  }
  return best;
}

// Helper: fetch and store citations from Semantic Scholar
async function fetchAndStoreCitations(paperId: string, doi: string | null, title: string | null, userId: string) {
  const ss = await fetchFromSemanticScholar(doi || undefined, title || undefined);
  if (!ss) return;
  
  // Update external_id if we have it now
  if (ss.external_id) {
    await query('UPDATE papers SET external_id = $1 WHERE id = $2 AND external_id IS NULL', [ss.external_id, paperId]);
  }

  // 1. Process Citations (Papers that cite THIS paper)
  // ss.citations are papers that cite our paperId. So cite.paperId is citing, paperId is cited.
  if (ss.citations) {
    for (const cite of ss.citations.slice(0, 50)) {
      try {
        const extDoi = cite.externalIds?.DOI || null;
        const extTitle = cite.title || null;
        if (!extDoi && !extTitle) continue;
        
        // Try to find if user has the citing paper in their DB
        let citedIdFromLocal = null;
        if (extDoi) {
          const { rows } = await query('SELECT id FROM papers WHERE doi = $1 AND user_id = $2', [extDoi, userId]);
          if (rows.length > 0) citedIdFromLocal = rows[0].id;
        }

        await query(`
          INSERT INTO citations (citing_paper_id, cited_paper_id, external_doi, external_title)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [citedIdFromLocal, paperId, extDoi, extTitle]);
      } catch (e) {}
    }
  }

  // 2. Process References (Papers that THIS paper cites)
  // ss.references are papers that our paperId cites. So paperId is citing, ref is cited.
  if (ss.references) {
    for (const ref of ss.references.slice(0, 50)) {
      try {
        const extDoi = ref.externalIds?.DOI || null;
        const extTitle = ref.title || null;
        if (!extDoi && !extTitle) continue;

        let citedIdFromLocal = null;
        if (extDoi) {
          const { rows } = await query('SELECT id FROM papers WHERE doi = $1 AND user_id = $2', [extDoi, userId]);
          if (rows.length > 0) citedIdFromLocal = rows[0].id;
        }

        await query(`
          INSERT INTO citations (citing_paper_id, cited_paper_id, external_doi, external_title)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [paperId, citedIdFromLocal, extDoi, extTitle]);
      } catch (e) {}
    }
  }
}

// Helper: check and award badges
async function checkAndAwardBadges(userId: string) {
  const { rows } = await query('SELECT total_papers_read FROM users WHERE id = $1', [userId]);
  const count = rows[0]?.total_papers_read || 0;

  const paperMilestones = [
    [1, 'first_paper'], [10, 'ten_papers'], [50, 'fifty_papers'], [100, 'hundred_papers']
  ] as const;

  for (const [milestone, badge] of paperMilestones) {
    if (count >= milestone) {
      await query(
        'INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badge]
      );
    }
  }

  // Field exploration badges
  const { rows: fieldRows } = await query(
    'SELECT COUNT(DISTINCT field) AS field_count FROM papers WHERE user_id = $1 AND field IS NOT NULL', [userId]
  );
  const fieldCount = parseInt(fieldRows[0]?.field_count || '0');
  if (fieldCount >= 5) await query('INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'five_fields']);
  if (fieldCount >= 10) await query('INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'ten_fields']);

  // Insight badges
  const { rows: insightRows } = await query(
    'SELECT COUNT(*) AS cnt FROM insights WHERE user_id = $1', [userId]
  );
  const insightCount = parseInt(insightRows[0]?.cnt || '0');
  if (insightCount >= 10) await query('INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'ten_insights']);
  if (insightCount >= 50) await query('INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'fifty_insights']);
  if (insightCount >= 100) await query('INSERT INTO badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'hundred_insights']);
}

export { checkAndAwardBadges };
export default router;
