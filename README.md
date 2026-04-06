# Aether

Research operating system for serious literature work.

Aether is not just a paper manager. It is a full-stack research intelligence workspace that helps you move from raw papers to defensible research directions, faster and with better traceability.

## Why Aether Is Different

Most tools stop at bibliographies and tags.
Aether builds an end-to-end research workflow:

1. Ingest papers quickly from DOI or search.
2. Extract structured evidence and methodology signals.
3. Build collections and shared research volumes.
4. Surface contradictions, benchmark gaps, and reproducibility risk.
5. Track high-potential research gaps in a visual board.
6. Generate proposal-ready draft scaffolds from validated gaps.

This turns passive reading into active research strategy.

## Core Capabilities

### Research Records (Aether Archive)
- Add papers from DOI, semantic search, or manual entry.
- Store titles, abstracts, venues, dates, authors, and external identifiers.
- Keep all paper intelligence in one place with fast access patterns.

### Deep Search
- Search papers and your own notes/insights in one flow.
- Filter by field and chronology.
- Combine full-text exploration with personal knowledge retrieval.

### Insights and Marginalia
- Capture insight fragments while reading.
- Categorize ideas by novelty, contradiction, limitation, and future work.
- Promote raw notes into structured research signals.

### Collections and Collaboration
- Group papers into themed archival volumes.
- Share collection links and collaborate with controlled access.
- Manage team research contexts without duplicating data.

### Dataset Analyzer
- Analyze DOI-linked papers for dataset references.
- Identify benchmark and data usage signals directly from metadata.
- Speed up method-to-dataset mapping during review.

### Research Intel Layer
- Per-paper annotations.
- Reproducibility cards with actionable missing-items checklist.
- Method and benchmark comparison tables at collection level.
- Contradiction detection across a collection.
- Proposal generator for collection-backed research plans.

### Gap Tracker Board
- Convert insights into trackable gap cards.
- Progress cards through idea, validating, running, and done.
- Run novelty checks against your archive.
- Generate draft paper skeletons from high-confidence gaps.

## What Makes It Powerful For Real Research

- Evidence traceability: every idea can be linked back to papers, notes, and collection context.
- Research velocity: move from reading to proposal framing in one product.
- Better decisions: contradiction and reproducibility signals reduce weak directions early.
- Team alignment: shared volumes make collaboration concrete and auditable.
- Production-ready architecture: modern frontend, typed backend, PostgreSQL with vector support.

## Product Experience

- Intentional archival visual language with unified gradients and high-contrast reading surfaces.
- Fast navigation across archive, search, collections, insights, datasets, and gap board.
- UI designed for long sessions and dense information scanning.

## Architecture

| Layer | Stack |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + pgvector |
| Auth | JWT + OAuth integrations |
| APIs | Semantic Scholar + metadata enrichment services |

## High-Level Workflow

1. Capture papers into the archive.
2. Extract notes, insights, and methodological evidence.
3. Organize into collections and compare approaches.
4. Run contradiction and reproducibility analysis.
5. Convert insights to gap cards and score novelty.
6. Draft proposals and paper skeletons with context attached.

## Hosted Usage First

This repository supports self-hosting, but Aether is designed to be consumed as a hosted app workflow.

In practice, users should not need to build locally to get value.
Deploy once, then onboard collaborators directly via the product.

## Minimal Deployment Surface

If you choose to deploy:

- Frontend: static Vite build.
- Backend: Node service with migrations on startup.
- Database: PostgreSQL with `vector` and `uuid-ossp` extensions.

Required runtime variables (backend):

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-strong-secret
FRONTEND_URL=https://your-frontend-domain
```

Required runtime variable (frontend):

```env
VITE_API_URL=https://your-backend-domain/api
```

## Security and Reliability Notes

- JWT-based authenticated API routes.
- Request rate limiting enabled under `/api`.
- Error handling middleware with consistent JSON response model.
- Explicit CORS policy controlled by `FRONTEND_URL`.

## Repository Map

```text
.
├── src/                    # Frontend app
│   ├── pages/              # Archive, Search, Collections, Insights, Gap Tracker, etc.
│   ├── components/         # Layout and shared UI
│   ├── lib/                # API client
│   └── stores/             # Client state
├── backend/
│   └── src/
│       ├── routes/         # Feature and API routes
│       ├── db/             # Pool and migrations
│       ├── middleware/     # Auth, rate limit, error handler
│       └── services/       # Metadata/vector/intel support services
├── docker-compose.yml      # Local infra convenience
└── README.md
```

## Who This Is For

- Researchers managing large paper volumes.
- Founders and R&D teams building evidence-backed roadmaps.
- Graduate students converting reading into thesis-grade direction.
- Labs that need shared context, not scattered docs.

## Current Product Status

Active development with production-oriented feature additions, including research intelligence endpoints, collaboration flows, and a visible gap-tracker pipeline.

## License

Proprietary by default unless replaced by a project-specific license file.
