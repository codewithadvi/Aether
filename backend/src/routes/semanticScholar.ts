import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import * as semanticScholarService from '../services/semanticScholarService';

const router = Router();
router.use(authenticate);

// GET /api/semantic-scholar/search — search papers
router.get('/search', async (req: Request, res: Response) => {
  const { query, limit = 10 } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'Query is required' });
  const results = await semanticScholarService.searchPapers(query as string, parseInt(limit as string));
  res.json({ success: true, data: results });
});

// GET /api/semantic-scholar/paper/:id — get paper details
router.get('/paper/:id(*)', async (req: Request, res: Response) => {
  const details = await semanticScholarService.getPaperDetails(req.params.id);
  if (!details) return res.status(404).json({ success: false, error: 'Paper not found on Semantic Scholar' });
  res.json({ success: true, data: details });
});

// GET /api/semantic-scholar/citations/:id — get citations and references
router.get('/citations/:id(*)', async (req: Request, res: Response) => {
  const result = await semanticScholarService.getCitationsAndReferences(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Could not fetch citations for this paper' });
  res.json({ success: true, data: result });
});

// POST /api/semantic-scholar/recommendations — get paper recommendations
router.post('/recommendations', async (req: Request, res: Response) => {
  const { paperIds, limit = 10 } = req.body;
  if (!Array.isArray(paperIds) || paperIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Provide at least one paper ID for recommendations' });
  }
  const recommended = await semanticScholarService.getRecommendedPapers(paperIds, limit);
  res.json({ success: true, data: recommended });
});

// GET /api/semantic-scholar/datasets — get datasets list
router.get('/datasets', async (req: Request, res: Response) => {
  const datasets = await semanticScholarService.getDatasetsList();
  res.json({ success: true, data: datasets });
});

// GET /api/semantic-scholar/datasets/:name — get dataset details
router.get('/datasets/:name', async (req: Request, res: Response) => {
  const details = await semanticScholarService.getDatasetDetails(req.params.name);
  if (!details) return res.status(404).json({ success: false, error: 'Dataset not found' });
  res.json({ success: true, data: details });
});

export default router;
