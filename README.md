# Aether

### *Where knowledge finds its shape.*

Aether is a research intelligence platform built for the modern scholar. It transforms the solitary, fragmented work of reading and cataloging papers into a structured, living knowledge graph — one that grows smarter with every paper you add. Unlike reference managers that simply store citations, or note-taking tools that leave insights siloed, Aether synthesizes across your entire archive: surfacing connections, detecting contradictions, scoring reproducibility, and scaffolding the next research proposal — automatically.

Nothing like it exists in the market today.

---

## The Problem

Researchers spend an enormous fraction of their time on the infrastructure of knowledge — tracking what they've read, finding what they missed, re-discovering insights they once captured, and constructing literature reviews from scratch each time. Every tool available today solves only a fragment of this. Zotero stores. Notion organizes. Semantic Scholar surfaces. But none of them think.

Aether is the first system to integrate all of these workflows into a single, coherent intelligence layer on top of your personal reading history.

---

## Core Philosophy

Aether is built around three convictions:

- **Context over cataloging.** A paper is not a reference — it is a node in a living network of ideas. Every entry you make strengthens that network.
- **Intelligence should be automatic.** Connections between papers, field classification, reproducibility signals, novelty scores — these should be computed for you, not by you.
- **Scholarship deserves beautiful tools.** The platform you spend hours inside should feel as considered as the work you do in it.

---

## Features

### Paper Ingestion and Archive Management

Add papers by DOI, URL, title, or manual entry. Aether automatically resolves full metadata — title, authors, abstract, publication venue, year, citation count — via the Semantic Scholar and Crossref APIs, falling back gracefully when sources are unavailable. Duplicate detection operates at both the DOI level and the metadata level, ensuring your archive stays clean. Field classification happens automatically at ingestion using keyword-based domain detection across Machine Learning, Computer Vision, NLP, Biology, Physics, Economics, Medicine, Mathematics, Systems, and more.

### Semantic Paper Connections

Every paper you add is embedded using a TF-IDF vector with hash-based locality-sensitive bucketing, stored in PostgreSQL via `pgvector`. When you open any paper, Aether computes cosine similarity across your entire archive and surfaces the most semantically related work — ranked by a confidence score derived from real vector distances. This requires no external AI API, no model to run, and no configuration. It just works.

### Citation Graph Tracking

Aether integrates deeply with the Semantic Scholar citation graph. For each paper, it fetches up to 50 references (papers it cites) and up to 50 citations (papers that cite it), linking them bidirectionally in the database. When a cited paper exists in your own archive, the relationship is recorded as a first-class database join. You can browse both directions — forward citations and backward references — directly from any paper's detail view.

### Research Gap Tracker

The Gap Tracker is a structured hypothesis board. Create gap cards from scratch or promote any captured insight directly into a research gap. Each card tracks a hypothesis, the dataset you'd need, a baseline to beat, expected risks, and a lifecycle status: `idea`, `validating`, `running`, or `done`.

Run a **Novelty Check** against your own archive to score how novel the hypothesis is relative to what you've already read, receive a feasibility score, and get an overlap summary of potentially conflicting papers. Promote any gap card into a **Draft Paper** — a structured skeleton including abstract, motivation, related work, methodology, and expected results — generated from the card's content.

### Contradiction Detection

For any collection, Aether performs pairwise analysis across all papers to detect semantic contradictions. It identifies shared conceptual terms between papers, then checks for opposing polarity signals — one paper claiming improvement where another claims failure. Results are ranked by a confidence score, giving you an automatically generated map of where the field disagrees with itself.

### Method Benchmark Table

For any collection, Aether extracts a structured comparison table across all papers: task, dataset, metrics, model family, compute budget, limitations, and failure modes — pulled from stored metadata and abstract signals. This is the literature review comparison table, generated without any manual data entry.

### Proposal Generation

From any collection, generate a structured research proposal draft in one click. Aether analyzes the collection to identify dominant fields, extract thematic keywords, and enumerate contributing venues, then constructs a coherent proposal with motivation, prior work summary, hypotheses, methodology sketch, and expected contributions.

### Reproducibility Scoring

Every paper is assigned a reproducibility card that scores it across four dimensions: code availability, dataset access, environment documentation, and model checkpoints. Signals are detected from titles, abstracts, and URLs. Each card includes a 0–100 reproducibility score and a list of missing artifacts, surfaced automatically from the paper's existing metadata.

### In-Paper Annotations

Capture quotes and annotations directly against any paper in your archive. Each annotation can carry a note, a page number, an anchor reference, and a type classification. Annotations are indexed and persisted per user, per paper.

### Collections and Organization

Group papers into named collections for projects, literature reviews, or reading queues. Papers can belong to multiple collections. Collections carry their own set of intelligence features — contradiction detection, benchmark tables, and proposal generation operate at the collection level.

### Insights and Ideas

Capture key insights from papers as first-class objects, tagged and timestamped. Promote insights into Gap Cards with one action. Separately, maintain a workspace of research ideas linked to their source papers, each carrying a status lifecycle from brainstorm to published.

### Deep Search

Search across your entire archive — titles, abstracts, authors, and fields — with filtering by field and author. Results are ranked and paginated, surfaced within sub-second response times on archives of thousands of papers.

### Academic Radar

The dashboard surfaces personalized paper recommendations from Semantic Scholar based on the external IDs of your most recently added papers. If no personalized signal is available, Aether falls back to trending queries in active research areas. Radar papers can be imported directly into your archive in a single click.

### Reading Statistics and Gamification

The dashboard tracks papers read, active reading streak, fields explored, and weekly reading trends over a rolling 12-week window. A progressive achievement system awards badges at milestones: first paper, 10, 50, and 100 papers; 5 and 10 distinct fields explored; and 10, 50, and 100 insights captured. Badges are displayed on the profile and notified on achievement.

### Data Export

Export your complete archive — papers, notes, insights, ideas, collections — in JSON format. Export individual collections or your full dataset. CSV export is available for papers and statistics.

### Authentication

Secure JWT-based session authentication with 30-day token validity. OAuth2 login via GitHub and Google. Password requirements enforced on registration. Rate limiting on all API endpoints via Redis-backed counters.

---

## Architecture

Aether is a full-stack TypeScript application with a decoupled frontend and backend.

**Frontend**

- React 19 with Vite
- Zustand for client state management
- TanStack Query for server state, caching, and background synchronization
- Framer Motion for micro-animations
- Recharts for data visualization
- Radix UI primitives for accessible components
- React Hook Form with Zod schema validation

**Backend**

- Node.js with Express on TypeScript
- PostgreSQL 16 with the `pgvector` extension for vector similarity search
- Redis for session caching and API rate limiting
- Bull for async job queuing
- Passport.js for multi-strategy authentication (JWT, GitHub OAuth, Google OAuth)
- Semantic Scholar and Crossref for external metadata resolution
- `pdf-parse` for PDF metadata extraction
- Winston for structured logging

**Infrastructure**

- Docker Compose for PostgreSQL (with pgvector) and Redis
- Database migrations via TypeScript migration scripts

---

## Design

Aether's visual language is the **Archival Volume** design system — a parchment-and-ink aesthetic rooted in editorial typography, warm neutral tones (`#fef9f1`, `#e3d7b8`, `#d9c1bc`), and a deep academic teal (`#2a697b`) as its action color. Every surface feels like a considered document rather than a dashboard. Typography is set in a serif editorial voice with label text in uppercase tracking for hierarchy. Radial gradients and subtle border work create depth without noise.

---

## Data Privacy

All user data is private and scoped per authenticated account. No data is shared between users without explicit action. Papers, notes, insights, annotations, ideas, and gap cards are all user-keyed and inaccessible to other accounts. Session tokens are invalidated on logout.

---

## API

Aether exposes a REST API covering all core entities: papers, notes, insights, collections, ideas, gaps, annotations, search, export, and statistics. All endpoints require JWT authentication. Responses follow a consistent `{ success, data, pagination? }` envelope. Rate limiting is enforced per user via Redis.

---

## Status

Aether is actively developed and deployed as a hosted research productivity platform. The system is designed for individual researchers, small research groups, and teams conducting systematic literature reviews.

---

*Aether — Where knowledge finds its shape.*
