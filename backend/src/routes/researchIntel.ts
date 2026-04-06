import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();
router.use(authenticate);

let intelTablesInitialized = false;

async function ensureIntelTables() {
  if (intelTablesInitialized) return;

  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await query(`
    CREATE TABLE IF NOT EXISTS paper_annotations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      annotation_type VARCHAR(30) NOT NULL DEFAULT 'highlight',
      page_number INTEGER,
      quote_text TEXT NOT NULL,
      note TEXT,
      anchor JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_paper_annotations_paper_user
    ON paper_annotations(paper_id, user_id, created_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reproducibility_cards (
      paper_id UUID PRIMARY KEY REFERENCES papers(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_available BOOLEAN NOT NULL DEFAULT false,
      data_available BOOLEAN NOT NULL DEFAULT false,
      environment_documented BOOLEAN NOT NULL DEFAULT false,
      checkpoints_available BOOLEAN NOT NULL DEFAULT false,
      missing_items JSONB NOT NULL DEFAULT '[]',
      score INTEGER NOT NULL DEFAULT 0,
      signals JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS proposal_drafts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(400) NOT NULL,
      motivation TEXT NOT NULL,
      prior_work TEXT NOT NULL,
      hypotheses TEXT NOT NULL,
      methodology_sketch TEXT NOT NULL,
      expected_contributions TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_proposal_drafts_collection_user
    ON proposal_drafts(collection_id, user_id, created_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gap_cards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
      source_insight_id UUID REFERENCES insights(id) ON DELETE SET NULL,
      title VARCHAR(300) NOT NULL,
      hypothesis TEXT NOT NULL,
      needed_dataset TEXT,
      baseline TEXT,
      expected_risk TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'validating', 'running', 'done')),
      novelty_score INTEGER,
      feasibility_score INTEGER,
      potential_score INTEGER,
      overlap_summary TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_gap_cards_user_status
    ON gap_cards(user_id, status, created_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gap_drafts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      gap_card_id UUID NOT NULL REFERENCES gap_cards(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(400) NOT NULL,
      abstract TEXT NOT NULL,
      motivation TEXT NOT NULL,
      related_work TEXT NOT NULL,
      methodology TEXT NOT NULL,
      expected_results TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_gap_drafts_gap_user
    ON gap_drafts(gap_card_id, user_id, created_at DESC)
  `);

  intelTablesInitialized = true;
}

function lowerText(value: string | null | undefined) {
  return (value || '').toLowerCase();
}

function buildReproducibilityCard(paper: any) {
  const title = lowerText(paper.title);
  const abstract = lowerText(paper.abstract);
  const url = lowerText(paper.url);
  const merged = `${title} ${abstract} ${url}`;

  const codeAvailable = /github|gitlab|code available|source code|repository/.test(merged);
  const dataAvailable = /dataset|data available|open data|benchmark|corpus/.test(merged);
  const environmentDocumented = /pytorch|tensorflow|jax|cuda|environment|docker|requirements\.txt/.test(merged);
  const checkpointsAvailable = /checkpoint|pretrained|model weights|hugging face/.test(merged);

  const missingItems: string[] = [];
  if (!codeAvailable) missingItems.push('code repository link');
  if (!dataAvailable) missingItems.push('dataset access details');
  if (!environmentDocumented) missingItems.push('environment and dependency specification');
  if (!checkpointsAvailable) missingItems.push('model checkpoints or weights');

  const score = [codeAvailable, dataAvailable, environmentDocumented, checkpointsAvailable].filter(Boolean).length * 25;

  return {
    codeAvailable,
    dataAvailable,
    environmentDocumented,
    checkpointsAvailable,
    missingItems,
    score,
    signals: {
      titleMatched: /benchmark|framework|evaluation/.test(title),
      hasMethodology: !!paper.methodology,
    },
  };
}

function extractKeywords(text: string) {
  const stop = new Set([
    'this', 'that', 'with', 'from', 'into', 'their', 'there', 'where', 'which', 'while', 'using', 'based', 'between',
    'study', 'paper', 'result', 'results', 'method', 'methods', 'analysis', 'approach', 'toward', 'through', 'across',
    'about', 'than', 'have', 'has', 'were', 'been', 'being', 'also', 'show', 'shows', 'used', 'over', 'under', 'for',
    'and', 'the', 'are', 'our', 'your', 'you', 'its', 'can', 'not', 'but', 'was', 'were', 'they', 'them'
  ]);

  const words = (text.toLowerCase().match(/[a-z]{5,}/g) || []).filter(w => !stop.has(w));
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
}

function sentenceSnippet(text: string) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
}

router.get('/paper/:paperId/annotations', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const ownership = await query('SELECT id FROM papers WHERE id = $1 AND user_id = $2', [req.params.paperId, user.id]);
    if (!ownership.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    }

    const { rows } = await query(
      `
        SELECT id, annotation_type, page_number, quote_text, note, anchor, created_at
        FROM paper_annotations
        WHERE paper_id = $1 AND user_id = $2
        ORDER BY created_at DESC
      `,
      [req.params.paperId, user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/paper/:paperId/annotations', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { annotation_type, page_number, quote_text, note, anchor } = req.body;

  if (!quote_text || !String(quote_text).trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'quote_text is required' } });
  }

  try {
    await ensureIntelTables();

    const ownership = await query('SELECT id FROM papers WHERE id = $1 AND user_id = $2', [req.params.paperId, user.id]);
    if (!ownership.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    }

    const { rows } = await query(
      `
        INSERT INTO paper_annotations (paper_id, user_id, annotation_type, page_number, quote_text, note, anchor)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, annotation_type, page_number, quote_text, note, anchor, created_at
      `,
      [
        req.params.paperId,
        user.id,
        annotation_type || 'highlight',
        Number.isFinite(Number(page_number)) ? Number(page_number) : null,
        String(quote_text).trim(),
        note || null,
        anchor ? JSON.stringify(anchor) : null,
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.delete('/annotations/:annotationId', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const { rowCount } = await query(
      'DELETE FROM paper_annotations WHERE id = $1 AND user_id = $2',
      [req.params.annotationId, user.id]
    );

    if (!rowCount) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Annotation not found' } });
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/paper/:paperId/reproducibility', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const paperRes = await query(
      `
        SELECT id, user_id, title, abstract, url, methodology
        FROM papers
        WHERE id = $1 AND user_id = $2
      `,
      [req.params.paperId, user.id]
    );

    const paper = paperRes.rows[0];
    if (!paper) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Paper not found' } });
    }

    const card = buildReproducibilityCard(paper);

    const { rows } = await query(
      `
        INSERT INTO reproducibility_cards (
          paper_id, user_id, code_available, data_available, environment_documented,
          checkpoints_available, missing_items, score, signals, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (paper_id)
        DO UPDATE SET
          code_available = EXCLUDED.code_available,
          data_available = EXCLUDED.data_available,
          environment_documented = EXCLUDED.environment_documented,
          checkpoints_available = EXCLUDED.checkpoints_available,
          missing_items = EXCLUDED.missing_items,
          score = EXCLUDED.score,
          signals = EXCLUDED.signals,
          updated_at = NOW()
        RETURNING paper_id, code_available, data_available, environment_documented, checkpoints_available, missing_items, score, signals, updated_at
      `,
      [
        paper.id,
        user.id,
        card.codeAvailable,
        card.dataAvailable,
        card.environmentDocumented,
        card.checkpointsAvailable,
        JSON.stringify(card.missingItems),
        card.score,
        JSON.stringify(card.signals),
      ]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/collection/:collectionId/method-benchmark-table', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const collCheck = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [req.params.collectionId, user.id]);
    if (!collCheck.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const paperRes = await query(
      `
        SELECT p.id, p.title, p.field, p.abstract, p.venue, p.methodology
        FROM papers p
        JOIN collection_papers cp ON cp.paper_id = p.id
        WHERE cp.collection_id = $1
        ORDER BY cp.added_at DESC
      `,
      [req.params.collectionId]
    );

    const rows = paperRes.rows.map((p: any) => {
      const methodology = p.methodology || {};
      const metrics = methodology.metrics || {};
      const metricPairs = Object.entries(metrics)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([k, v]) => `${k}: ${String(v)}`);

      const abstract = lowerText(p.abstract);
      const dataset = /imagenet|cifar|mnist|squad|wmt|glue|coco|mimic/.exec(abstract)?.[0] || null;
      const modelFamily = /transformer|cnn|rnn|graph neural|llm|diffusion/.exec(abstract)?.[0] || null;
      const computeBudget = /gpu|a100|v100|hours|days|flops/.exec(abstract)?.[0] || null;
      const limitation = /limitation|fails|failure|bias|costly|expensive/.exec(abstract)?.[0] || null;

      return {
        paper_id: p.id,
        title: p.title,
        task: p.field || 'Unspecified',
        dataset: methodology.data_source || dataset || 'Not specified',
        metrics: metricPairs.length > 0 ? metricPairs.join(' | ') : 'Not reported',
        model_family: methodology.architecture || modelFamily || 'Not specified',
        compute_budget: computeBudget || 'Not specified',
        limitations: limitation || 'Not explicitly stated',
        failure_modes: /failure|breakdown|error|misclassif/.test(abstract) ? 'Mentioned in abstract' : 'Not clearly reported',
        venue: p.venue || 'Unknown venue',
      };
    });

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/collection/:collectionId/contradictions', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const collCheck = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [req.params.collectionId, user.id]);
    if (!collCheck.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const paperRes = await query(
      `
        SELECT p.id, p.title, p.abstract
        FROM papers p
        JOIN collection_papers cp ON cp.paper_id = p.id
        WHERE cp.collection_id = $1
      `,
      [req.params.collectionId]
    );

    const papers = paperRes.rows;
    const signals: any[] = [];

    const positive = ['improve', 'improves', 'increase', 'better', 'robust', 'efficient'];
    const negative = ['decrease', 'worse', 'fails', 'failure', 'fragile', 'costly'];

    for (let i = 0; i < papers.length; i += 1) {
      for (let j = i + 1; j < papers.length; j += 1) {
        const p1 = papers[i];
        const p2 = papers[j];

        const t1 = lowerText(`${p1.title || ''} ${p1.abstract || ''}`);
        const t2 = lowerText(`${p2.title || ''} ${p2.abstract || ''}`);

        const shared = extractKeywords(`${t1} ${t2}`).slice(0, 6).filter((k) => t1.includes(k) && t2.includes(k));
        if (shared.length === 0) continue;

        const pos1 = positive.filter(w => t1.includes(w)).length;
        const neg1 = negative.filter(w => t1.includes(w)).length;
        const pos2 = positive.filter(w => t2.includes(w)).length;
        const neg2 = negative.filter(w => t2.includes(w)).length;

        const opposite = (pos1 > 0 && neg2 > 0) || (neg1 > 0 && pos2 > 0);
        if (!opposite) continue;

        const confidence = Math.min(0.95, 0.45 + (shared.length * 0.08) + (Math.min(pos1 + neg1, pos2 + neg2) * 0.03));

        signals.push({
          paper_a: { id: p1.id, title: p1.title, snippet: sentenceSnippet(p1.abstract) },
          paper_b: { id: p2.id, title: p2.title, snippet: sentenceSnippet(p2.abstract) },
          shared_terms: shared,
          confidence: Number(confidence.toFixed(2)),
          rationale: 'Opposite polarity language detected around shared topics.',
        });
      }
    }

    signals.sort((a, b) => b.confidence - a.confidence);

    res.json({ success: true, data: signals.slice(0, 12) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/collection/:collectionId/proposal', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const collRes = await query('SELECT id, name, description FROM collections WHERE id = $1 AND user_id = $2', [req.params.collectionId, user.id]);
    const collection = collRes.rows[0];

    if (!collection) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const paperRes = await query(
      `
        SELECT p.title, p.abstract, p.field, p.venue, p.methodology
        FROM papers p
        JOIN collection_papers cp ON cp.paper_id = p.id
        WHERE cp.collection_id = $1
        ORDER BY cp.added_at DESC
      `,
      [req.params.collectionId]
    );

    const papers = paperRes.rows;
    const fields = Object.entries(
      papers.reduce((acc: Record<string, number>, p: any) => {
        const k = p.field || 'Uncategorized';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const topField = fields[0]?.[0] || 'research area';
    const keywords = extractKeywords(papers.map((p: any) => `${p.title || ''} ${p.abstract || ''}`).join(' ')).slice(0, 8);
    const venues = Array.from(new Set(papers.map((p: any) => p.venue).filter(Boolean))).slice(0, 5);

    const title = `Proposal Draft: ${collection.name}`;
    const motivation = `This proposal targets open problems in ${topField}. The collection highlights recurring themes including ${keywords.slice(0, 4).join(', ')}. The motivation is to address unresolved performance and generalization challenges evidenced across the curated literature.`;
    const priorWork = `Prior work in this collection spans ${papers.length} papers${venues.length ? ` with representative venues such as ${venues.join(', ')}` : ''}. The corpus indicates active progress but uneven evidence quality across datasets and evaluation settings.`;
    const hypotheses = `H1: A method integrating ${keywords.slice(0, 2).join(' and ')} will improve robustness over baseline approaches. H2: Explicit control over data and training assumptions will reduce contradiction across reported outcomes.`;
    const methodologySketch = `We will benchmark candidate models on clearly defined datasets, report reproducibility artifacts (code, environment, checkpoints), and evaluate with standardized metrics. Comparison protocols will include ablation studies, statistical confidence checks, and failure-mode analysis.`;
    const expectedContributions = `Expected contributions include: (1) a reproducible benchmark protocol, (2) a stronger method for ${topField}, (3) clarified contradiction points in existing literature, and (4) practical implementation guidance for downstream researchers.`;

    const { rows } = await query(
      `
        INSERT INTO proposal_drafts (
          collection_id, user_id, title, motivation, prior_work, hypotheses, methodology_sketch, expected_contributions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        req.params.collectionId,
        user.id,
        title,
        motivation,
        priorWork,
        hypotheses,
        methodologySketch,
        expectedContributions,
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/collection/:collectionId/proposal-latest', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const collCheck = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [req.params.collectionId, user.id]);
    if (!collCheck.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
    }

    const { rows } = await query(
      `
        SELECT *
        FROM proposal_drafts
        WHERE collection_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [req.params.collectionId, user.id]
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/gaps', async (req: Request, res: Response) => {
  const user = req.user as any;
  const status = (req.query.status as string) || null;
  const collectionId = (req.query.collection_id as string) || null;

  try {
    await ensureIntelTables();

    const params: any[] = [user.id];
    let q = `
      SELECT gc.*, c.name AS collection_name, i.content AS source_insight_content
      FROM gap_cards gc
      LEFT JOIN collections c ON c.id = gc.collection_id
      LEFT JOIN insights i ON i.id = gc.source_insight_id
      WHERE gc.user_id = $1
    `;

    if (status) {
      params.push(status);
      q += ` AND gc.status = $${params.length}`;
    }
    if (collectionId) {
      params.push(collectionId);
      q += ` AND gc.collection_id = $${params.length}`;
    }

    q += ' ORDER BY gc.updated_at DESC';

    const { rows } = await query(q, params);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/gaps', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, hypothesis, needed_dataset, baseline, expected_risk, status = 'idea', collection_id } = req.body;

  if (!title || !hypothesis) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and hypothesis are required' } });
  }

  const nextStatus = ['idea', 'validating', 'running', 'done'].includes(status) ? status : 'idea';

  try {
    await ensureIntelTables();

    if (collection_id) {
      const coll = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [collection_id, user.id]);
      if (!coll.rows[0]) {
        return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
      }
    }

    const { rows } = await query(
      `
        INSERT INTO gap_cards (user_id, collection_id, title, hypothesis, needed_dataset, baseline, expected_risk, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [user.id, collection_id || null, title, hypothesis, needed_dataset || null, baseline || null, expected_risk || null, nextStatus]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/gaps/from-insight/:insightId', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { collection_id } = req.body;

  try {
    await ensureIntelTables();

    const insRes = await query('SELECT * FROM insights WHERE id = $1 AND user_id = $2', [req.params.insightId, user.id]);
    const insight = insRes.rows[0];
    if (!insight) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Insight not found' } });
    }

    if (collection_id) {
      const coll = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [collection_id, user.id]);
      if (!coll.rows[0]) {
        return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
      }
    }

    const hypothesis = String(insight.content || '').trim();
    const title = hypothesis.length > 80 ? `${hypothesis.slice(0, 77)}...` : hypothesis;

    const { rows } = await query(
      `
        INSERT INTO gap_cards (user_id, collection_id, source_insight_id, title, hypothesis, status)
        VALUES ($1, $2, $3, $4, $5, 'idea')
        RETURNING *
      `,
      [user.id, collection_id || null, insight.id, title || 'Insight-derived gap', hypothesis || 'New research hypothesis']
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.patch('/gaps/:gapId', async (req: Request, res: Response) => {
  const user = req.user as any;
  const { title, hypothesis, needed_dataset, baseline, expected_risk, status, collection_id } = req.body;
  const nextStatus = status && ['idea', 'validating', 'running', 'done'].includes(status) ? status : undefined;

  try {
    await ensureIntelTables();

    if (collection_id) {
      const coll = await query('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [collection_id, user.id]);
      if (!coll.rows[0]) {
        return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Collection not found' } });
      }
    }

    const { rows } = await query(
      `
        UPDATE gap_cards
        SET
          title = COALESCE($1, title),
          hypothesis = COALESCE($2, hypothesis),
          needed_dataset = COALESCE($3, needed_dataset),
          baseline = COALESCE($4, baseline),
          expected_risk = COALESCE($5, expected_risk),
          status = COALESCE($6, status),
          collection_id = COALESCE($7, collection_id),
          updated_at = NOW()
        WHERE id = $8 AND user_id = $9
        RETURNING *
      `,
      [title, hypothesis, needed_dataset, baseline, expected_risk, nextStatus, collection_id, req.params.gapId, user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Gap card not found' } });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.delete('/gaps/:gapId', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const { rowCount } = await query('DELETE FROM gap_cards WHERE id = $1 AND user_id = $2', [req.params.gapId, user.id]);
    if (!rowCount) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Gap card not found' } });
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/gaps/:gapId/novelty-check', async (req: Request, res: Response) => {
  const user = req.user as any;

  try {
    await ensureIntelTables();

    const gapRes = await query('SELECT * FROM gap_cards WHERE id = $1 AND user_id = $2', [req.params.gapId, user.id]);
    const gap = gapRes.rows[0];
    if (!gap) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Gap card not found' } });
    }

    const queryText = `${gap.title || ''} ${gap.hypothesis || ''}`.trim();

    const localMatches = await query(
      `
        SELECT id, title, abstract
        FROM papers
        WHERE user_id = $1
          AND (title ILIKE $2 OR abstract ILIKE $2)
        ORDER BY created_at DESC
        LIMIT 8
      `,
      [user.id, `%${queryText.split(' ').slice(0, 5).join('%')}%`]
    );

    const overlapCount = localMatches.rows.length;
    const noveltyScore = Math.max(5, 100 - (overlapCount * 12));
    const feasibilityScore = gap.needed_dataset ? 75 : 55;
    const potentialScore = Math.round((noveltyScore * 0.5) + (feasibilityScore * 0.5));
    const overlapSummary = overlapCount > 0
      ? `Found ${overlapCount} potentially overlapping papers in your local archive.`
      : 'No strong overlap found in your local archive.';

    const { rows } = await query(
      `
        UPDATE gap_cards
        SET novelty_score = $1,
            feasibility_score = $2,
            potential_score = $3,
            overlap_summary = $4,
            updated_at = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `,
      [noveltyScore, feasibilityScore, potentialScore, overlapSummary, gap.id, user.id]
    );

    res.json({
      success: true,
      data: {
        gap: rows[0],
        overlap_papers: localMatches.rows,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/gaps/:gapId/draft', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();

    const gapRes = await query('SELECT * FROM gap_cards WHERE id = $1 AND user_id = $2', [req.params.gapId, user.id]);
    const gap = gapRes.rows[0];
    if (!gap) {
      return res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Gap card not found' } });
    }

    const title = `Draft Paper: ${gap.title}`;
    const abstract = `This draft investigates the hypothesis: ${gap.hypothesis}. The study focuses on ${gap.needed_dataset || 'a target dataset to be defined'}, benchmarking against ${gap.baseline || 'a relevant baseline'} while addressing identified risks.`;
    const motivation = `Current literature leaves a gap around this question. This work aims to produce evidence-driven clarification and practical experimental outcomes.`;
    const relatedWork = `Related work should include papers overlapping with this hypothesis and any contradiction signals identified during novelty checks.`;
    const methodology = `Planned methodology: dataset (${gap.needed_dataset || 'TBD'}), baseline (${gap.baseline || 'TBD'}), evaluation metrics and reproducibility checklist.`;
    const expectedResults = `Expected result: validate or refute the hypothesis with transparent reporting and reproducible artifacts.`;

    const { rows } = await query(
      `
        INSERT INTO gap_drafts (gap_card_id, user_id, title, abstract, motivation, related_work, methodology, expected_results)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [gap.id, user.id, title, abstract, motivation, relatedWork, methodology, expectedResults]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/gaps/:gapId/draft-latest', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    await ensureIntelTables();
    const { rows } = await query(
      `
        SELECT gd.*
        FROM gap_drafts gd
        JOIN gap_cards gc ON gc.id = gd.gap_card_id
        WHERE gd.gap_card_id = $1 AND gc.user_id = $2
        ORDER BY gd.created_at DESC
        LIMIT 1
      `,
      [req.params.gapId, user.id]
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
