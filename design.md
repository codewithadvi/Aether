# Research Paper Tracker - Design Document

## Overview

The Research Paper Tracker is a comprehensive platform for managing, organizing, and extracting insights from research papers. This design document outlines the technical architecture, data models, and implementation strategy for building a scalable, maintainable system that serves researchers, academics, and knowledge workers.

### Design Goals

1. **Usability**: Minimal friction for adding papers and capturing insights
2. **Scalability**: Support 100,000+ concurrent users with sub-500ms response times
3. **Reliability**: 99.5% uptime with data integrity guarantees
4. **Extensibility**: Open API for third-party integrations
5. **Privacy**: End-to-end encryption and GDPR/CCPA compliance
6. **Community**: Open-source with clear contribution pathways

### Key Design Decisions

- **Monolithic with Service Boundaries**: Start with a monolithic architecture with clear service boundaries to enable future microservices migration
- **PostgreSQL Primary Store**: Relational database for strong consistency and ACID guarantees
- **Redis Caching Layer**: In-memory caching for metadata, search results, and recommendations
- **Elasticsearch for Full-Text Search**: Dedicated search engine for paper content and metadata
- **Async Job Queue**: Background processing for metadata fetching, connection discovery, and recommendations
- **JWT-based Authentication**: Stateless authentication with OAuth2 support


## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Web UI      │  │  Mobile App  │  │  CLI Tool    │           │
│  │  (React)     │  │  (React Native)  │  (Node.js)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   API Gateway     │
                    │  (Rate Limiting)  │
                    └─────────┬─────────┘
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  REST API (Express.js / FastAPI)                         │   │
│  │  ┌────────────┬────────────┬────────────┬────────────┐   │   │
│  │  │ Auth       │ Paper      │ Note       │ Collection │   │   │
│  │  │ Service    │ Service    │ Service    │ Service    │   │   │
│  │  └────────────┴────────────┴────────────┴────────────┘   │   │
│  │  ┌────────────┬────────────┬────────────┬────────────┐   │   │
│  │  │ Insight    │ Idea       │ Connection │ Recommend  │   │   │
│  │  │ Service    │ Service    │ Engine     │ Engine     │   │   │
│  │  └────────────┴────────────┴────────────┴────────────┘   │   │
│  │  ┌────────────┬────────────┬────────────┬────────────┐   │   │
│  │  │ Stats      │ Search     │ Ingestion  │ Citation   │   │   │
│  │  │ Engine     │ Engine     │ Service    │ Tracker    │   │   │
│  │  └────────────┴────────────┴────────────┴────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Data Layer    │  │  Cache Layer    │  │  Search Layer   │
│  PostgreSQL    │  │  Redis          │  │  Elasticsearch  │
│  - Papers      │  │  - Metadata     │  │  - Full-text    │
│  - Users       │  │  - Sessions     │  │  - Indexing     │
│  - Notes       │  │  - Results      │  │  - Aggregations │
│  - Insights    │  │  - Connections  │  │                 │
│  - Ideas       │  │                 │  │                 │
│  - Collections │  │                 │  │                 │
│  - Badges      │  │                 │  │                 │
└────────────────┘  └─────────────────┘  └─────────────────┘
        │
┌───────▼────────────────────────────────────────────────────┐
│  External Services                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Crossref API │  │ Semantic     │  │ OAuth2       │     │
│  │ (Metadata)   │  │ Scholar API  │  │ Providers    │     │
│  │              │  │ (Citations)  │  │ (Auth)       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### Service Architecture

The system uses a **monolithic architecture with clear service boundaries**, allowing for future microservices migration. Each service encapsulates specific business logic:

**Core Services:**
- **Auth Service**: User authentication, authorization, session management
- **Paper Service**: Paper CRUD operations, metadata management, duplicate detection
- **Ingestion Service**: Metadata fetching from external APIs, PDF processing, validation
- **Note Service**: Note creation, retrieval, rich-text storage
- **Insight Service**: Insight capture, tagging, categorization
- **Idea Service**: Idea management, multi-paper references, status tracking
- **Collection Service**: Collection management, sharing, permissions
- **Connection Engine**: Similarity detection, confidence scoring, incremental updates
- **Recommendation Engine**: Related paper suggestions, ranking algorithms
- **Citation Tracker**: Citation extraction, relationship mapping, graph visualization
- **Stats Engine**: Aggregation, streak tracking, milestone detection
- **Search Engine**: Full-text search, filtering, advanced queries
- **Classification Engine**: Field assignment, accuracy tracking

### Data Flow

**Paper Addition Flow:**
```
User Input (URL/DOI/PDF)
    ↓
Ingestion Service (Validation)
    ↓
External API Calls (Crossref, Semantic Scholar)
    ↓
Duplicate Detection
    ↓
Paper Repository (Storage)
    ↓
Elasticsearch Indexing
    ↓
Connection Engine (Async)
    ↓
Recommendation Cache Invalidation
```

**Search Flow:**
```
User Query
    ↓
Search Engine (Elasticsearch)
    ↓
Filter & Sort
    ↓
Cache Check
    ↓
Return Results
```

**Recommendation Flow:**
```
User Views Paper
    ↓
Check Cache
    ↓
Recommendation Engine (if cache miss)
    ↓
Similarity Calculation
    ↓
Ranking & Filtering
    ↓
Cache Results
    ↓
Return to User
```


## Data Models

### Entity-Relationship Diagram

```
┌─────────────────┐
│     User        │
├─────────────────┤
│ id (PK)         │
│ email           │
│ password_hash   │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Paper  │ │ Note   │ │Insight │ │ Idea   │ │Collection
│        │ │        │ │        │ │        │ │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │          │          │          │          │
    └──────────┴──────────┴──────────┴──────────┘
              (user_id FK)

┌──────────────────┐
│ Paper            │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ title            │
│ authors          │
│ abstract         │
│ doi              │
│ url              │
│ publication_date │
│ venue            │
│ field            │
│ citation_count   │
│ created_at       │
│ updated_at       │
└──────────────────┘
    │
    ├─ 1:N → Note
    ├─ 1:N → Insight
    ├─ 1:N → Idea (as source)
    ├─ M:N → Collection
    ├─ M:N → Paper (citations)
    └─ M:N → Paper (connections)

┌──────────────────┐
│ Note             │
├──────────────────┤
│ id (PK)          │
│ paper_id (FK)    │
│ user_id (FK)     │
│ content          │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ Insight          │
├──────────────────┤
│ id (PK)          │
│ paper_id (FK)    │
│ user_id (FK)     │
│ content          │
│ category         │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ Idea             │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ title            │
│ description      │
│ status           │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ IdeaPaperRef     │
├──────────────────┤
│ idea_id (FK)     │
│ paper_id (FK)    │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│ Collection       │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ name             │
│ description      │
│ is_shared        │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ CollectionPaper  │
├──────────────────┤
│ collection_id(FK)│
│ paper_id (FK)    │
│ added_at         │
└──────────────────┘

┌──────────────────┐
│ Connection       │
├──────────────────┤
│ id (PK)          │
│ paper_id_1 (FK)  │
│ paper_id_2 (FK)  │
│ confidence_score │
│ reason           │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ Citation         │
├──────────────────┤
│ id (PK)          │
│ citing_paper(FK) │
│ cited_paper (FK) │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│ Badge            │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ badge_type       │
│ earned_at        │
└──────────────────┘
```

### Core Entities

**User**
- Stores authentication credentials, profile information
- Relationships: 1:N with Papers, Notes, Insights, Ideas, Collections, Badges
- Encryption: Password hashed with bcrypt, sensitive fields encrypted at rest

**Paper**
- Core entity representing a research publication
- Fields: title, authors (JSON array), abstract, DOI, URL, publication_date, venue, field, citation_count
- Relationships: 1:N with Notes/Insights, M:N with Collections, M:N with other Papers (citations/connections)
- Indexing: Full-text index on title, abstract, authors; B-tree index on DOI, publication_date

**Note**
- Free-form text associated with a paper
- Supports rich text (stored as HTML or Markdown)
- Timestamped for audit trail
- Indexed for full-text search

**Insight**
- Highlighted finding from a paper
- Includes category tags (novel methodology, surprising result, contradicts prior work, etc.)
- Exportable for reports and summaries

**Idea**
- User's own research ideas inspired by papers
- Can reference multiple papers
- Status tracking: brainstorm, in progress, published, abandoned
- Enables idea-to-paper traceability

**Collection**
- User-created grouping of papers
- Supports sharing (read-only or collaborative)
- Enables project-based organization

**Connection**
- Represents similarity between two papers
- Confidence score (0-100) indicates strength
- Reason field explains connection type (shared authors, keyword overlap, citation relationship, field similarity)

**Citation**
- Represents citation relationship between papers
- Directional: citing_paper → cited_paper
- Enables citation graph traversal

**Badge**
- Achievement earned by user
- Types: milestone (papers read), field exploration, author tracking, insight capture
- Timestamped for display on profile

### Database Schema Considerations

**Indexing Strategy:**
- Primary keys: All entities indexed
- Foreign keys: All FK columns indexed for join performance
- Full-text: Composite index on (title, abstract, authors) for search
- Temporal: Index on created_at, updated_at for time-range queries
- Uniqueness: Composite unique index on (user_id, doi) for duplicate detection

**Partitioning:**
- Papers table: Partition by user_id for multi-tenancy isolation
- Notes/Insights: Partition by paper_id for query optimization
- Connections: Partition by paper_id_1 for efficient neighbor queries

**Denormalization:**
- Paper.citation_count: Denormalized for performance (updated async)
- User.total_papers_read: Denormalized for dashboard stats
- Connection.reason: Denormalized to avoid join on connection type table


## Core Services and Modules

### 1. Paper Ingestion Service

**Responsibilities:**
- Accept papers via URL, DOI, ISBN, manual entry, or PDF upload
- Fetch metadata from external sources
- Detect and prevent duplicates
- Validate required fields
- Extract metadata from PDFs

**Key Algorithms:**

**Duplicate Detection:**
```
Input: New paper metadata
Process:
  1. Normalize title (lowercase, remove punctuation)
  2. Check exact DOI match (highest confidence)
  3. Check title + authors match (high confidence)
  4. Check title similarity (Levenshtein distance < 5%)
  5. Check author + year match
Output: Duplicate status with confidence score
```

**Metadata Fetching Priority:**
```
1. If DOI provided → Crossref API
2. If URL provided → Semantic Scholar API, then page scraping
3. If ISBN provided → ISBN database
4. If PDF provided → PDF metadata extraction + Semantic Scholar
5. Fallback → Manual entry required
```

**Implementation Details:**
- Async processing with job queue (Bull/Celery)
- Retry logic with exponential backoff for API failures
- Caching of fetched metadata (24-hour TTL)
- Rate limiting to respect API quotas

### 2. Paper Repository

**Responsibilities:**
- CRUD operations on papers
- Efficient retrieval with sub-200ms latency
- Maintain referential integrity
- Track modification history
- Support full-text search

**Query Patterns:**
- Get paper by ID: O(1) via primary key
- Get papers by user: O(log n) via user_id index
- Get papers by field: O(log n) via field index
- Full-text search: O(log n) via Elasticsearch
- Get connections: O(log n) via connection index

**Caching Strategy:**
- Cache individual papers (Redis, 1-hour TTL)
- Cache user's paper list (Redis, 30-minute TTL)
- Cache search results (Redis, 5-minute TTL)
- Invalidate on write operations

### 3. Connection Engine

**Responsibilities:**
- Analyze papers for similarity
- Assign confidence scores
- Update connections incrementally
- Provide ranked connection lists

**Similarity Signals:**

```
Confidence Score = (
  (shared_authors_weight * author_similarity) +
  (keyword_weight * keyword_overlap) +
  (citation_weight * citation_relationship) +
  (field_weight * field_similarity)
) / 4

Where:
- author_similarity: Jaccard similarity of author sets
- keyword_overlap: Cosine similarity of TF-IDF vectors
- citation_relationship: 1 if papers cite each other, 0.5 if one cites other
- field_similarity: 1 if same field, 0.5 if related fields

Thresholds:
- Display if confidence >= 60
- Strong connection if confidence >= 80
- Weak connection if 60 <= confidence < 80
```

**Incremental Update Strategy:**
- When new paper added: Compare against all existing papers (async)
- Batch processing: Process 100 papers at a time
- Exponential backoff: Reduce frequency as collection grows
- Cache results for 24 hours

### 4. Recommendation Engine

**Responsibilities:**
- Suggest related papers
- Rank recommendations by relevance
- Exclude papers already in collection
- Support multiple recommendation strategies

**Recommendation Strategies:**

**Strategy 1: Connection-Based**
```
For paper P:
  1. Get all connected papers (confidence >= 60)
  2. Rank by confidence score
  3. Filter out papers already in user's collection
  4. Return top 10
```

**Strategy 2: Citation-Based**
```
For paper P:
  1. Get papers cited by P (direct citations)
  2. Get papers that cite P (reverse citations)
  3. Rank by citation count
  4. Filter out papers already in collection
  5. Return top 10
```

**Strategy 3: History-Based**
```
For user U:
  1. Get all papers read by U
  2. Extract keywords and fields
  3. Find papers with similar keywords/fields
  4. Rank by relevance score
  5. Filter out papers already in collection
  6. Return top 10
```

**Ranking Formula:**
```
Relevance Score = (
  (connection_weight * connection_score) +
  (citation_weight * citation_score) +
  (history_weight * history_score)
) / 3

Where weights are configurable (default: 0.4, 0.3, 0.3)
```

### 5. Stats Engine

**Responsibilities:**
- Calculate reading statistics
- Track streaks
- Detect milestones
- Generate achievement notifications

**Key Metrics:**

**Weekly Stats:**
- Papers read this week
- Papers by field (breakdown)
- Top authors
- Reading streak (consecutive days)

**Historical Trends:**
- Papers per week (last 12 weeks)
- Field distribution over time
- Author diversity over time

**Milestone Detection:**
```
Milestones:
- First paper
- 10 papers total
- 50 papers total
- 100 papers total
- 1-year reading streak
- 5 different fields
- 10 different fields
- 10 different authors
- 50 different authors
- 10 insights captured
- 50 insights captured
- 100 insights captured
```

**Streak Calculation:**
```
For user U:
  1. Get all papers added by U, grouped by date
  2. Find longest consecutive sequence of dates with >= 1 paper
  3. Check if streak is still active (includes today or yesterday)
  4. Return streak length and status
```

### 6. Search Engine

**Responsibilities:**
- Full-text search across papers and notes
- Advanced filtering and sorting
- Save search queries
- Sub-500ms response times

**Search Implementation:**
- Primary: Elasticsearch for full-text search
- Fallback: PostgreSQL full-text search (if Elasticsearch unavailable)
- Indexing: Real-time indexing on paper/note creation

**Query Types:**

**Simple Search:**
```
Query: "machine learning"
Searches: title, abstract, authors, notes
Returns: Ranked by relevance (BM25 scoring)
```

**Advanced Search:**
```
Query: "machine learning" AND field:AI NOT author:"John Smith"
Supports: AND, OR, NOT operators
Filters: field, author, year, collection
```

**Sorting Options:**
- Relevance (default)
- Date added (newest first)
- Publication date (newest first)
- Citation count (highest first)

### 7. Citation Tracker

**Responsibilities:**
- Extract citations from papers
- Store citation relationships
- Provide citation graph visualization
- Update citation counts

**Citation Extraction:**
- Primary: Semantic Scholar API (most comprehensive)
- Fallback: Manual entry or PDF parsing
- Caching: 7-day TTL for citation data

**Citation Graph Visualization:**
```
Nodes: Papers
Edges: Citation relationships (directed)
Visualization: Force-directed graph layout
Interaction: Click to view paper, hover for metadata
```

### 8. Classification Engine

**Responsibilities:**
- Automatically assign papers to fields
- Support manual field assignment
- Maintain classification accuracy
- Enable custom field creation

**Classification Approach:**

**Primary Method: Keyword Matching**
```
For paper P:
  1. Extract keywords from title, abstract, venue
  2. Match against field keyword database
  3. Calculate field scores
  4. Assign to field with highest score (if >= threshold)
  5. Support multiple field assignment
```

**Secondary Method: Venue-Based**
```
For paper P:
  1. Look up venue in venue-to-field mapping
  2. Assign to corresponding field
  3. Use as fallback if keyword matching fails
```

**Accuracy Tracking:**
- Track user corrections to classification
- Retrain keyword database monthly
- Target: >= 85% accuracy
- Measure: Precision, recall, F1-score

**Custom Fields:**
- Users can create custom fields
- Custom fields stored per-user
- Shared custom fields for teams


## Technology Stack

### Backend

**Framework:** Node.js with Express.js (or Python with FastAPI)
- Rationale: JavaScript ecosystem for rapid development, strong async support, large community
- Alternative: Python/FastAPI for data science integration, better ML library support

**Runtime:** Node.js 18+ LTS
- Rationale: Long-term support, stable, widely deployed

**Package Manager:** npm or yarn
- Rationale: Standard for Node.js ecosystem

### Database

**Primary Store:** PostgreSQL 14+
- Rationale: ACID compliance, strong consistency, excellent JSON support, full-text search
- Features: Partitioning, advanced indexing, window functions
- Connection pooling: PgBouncer or node-postgres pool

**Cache Layer:** Redis 7+
- Rationale: In-memory caching for metadata, sessions, search results
- Use cases: Session storage, metadata cache, connection cache, recommendation cache
- Eviction policy: LRU with 1GB default size

**Search Engine:** Elasticsearch 8+
- Rationale: Full-text search, aggregations, real-time indexing
- Alternatives: Meilisearch (simpler, self-hosted), Algolia (managed, expensive)
- Index strategy: One index per user for isolation, daily snapshots

### External APIs

**Metadata Sources:**
- Crossref API: DOI metadata (free, no auth required)
- Semantic Scholar API: Citation data, paper metadata (free, rate-limited)
- OpenAlex API: Alternative metadata source (free, open)

**Authentication:**
- OAuth2 providers: GitHub, Google (via Passport.js)
- Email/password: bcrypt for hashing, JWT for tokens

### Frontend

**Framework:** React 18+ with TypeScript
- Rationale: Component-based, large ecosystem, strong typing
- State management: Redux or Zustand
- UI library: Material-UI or Tailwind CSS

**Alternative:** Vue 3 with TypeScript
- Rationale: Simpler learning curve, excellent documentation

### DevOps and Deployment

**Containerization:** Docker
- Rationale: Consistent environments, easy deployment

**Orchestration:** Docker Compose (development), Kubernetes (production)
- Rationale: Docker Compose for simplicity, Kubernetes for scale

**CI/CD:** GitHub Actions
- Rationale: Free for open-source, integrated with GitHub

**Monitoring:** Prometheus + Grafana
- Rationale: Open-source, industry standard

**Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- Rationale: Centralized logging, searchable, open-source

### Development Tools

**Testing:**
- Unit tests: Jest (Node.js), Pytest (Python)
- Integration tests: Supertest (API testing)
- Property-based tests: fast-check (JavaScript), Hypothesis (Python)
- E2E tests: Cypress or Playwright

**Code Quality:**
- Linting: ESLint (JavaScript), Pylint (Python)
- Formatting: Prettier (JavaScript), Black (Python)
- Type checking: TypeScript (JavaScript), mypy (Python)

**Documentation:**
- API docs: Swagger/OpenAPI
- Code docs: JSDoc (JavaScript), Sphinx (Python)
- Architecture docs: Markdown in repository


## API Design

### REST Endpoints

**Authentication Endpoints:**
```
POST   /api/auth/register          - Create new account
POST   /api/auth/login             - Login with email/password
POST   /api/auth/oauth/:provider   - OAuth2 login (github, google)
POST   /api/auth/logout            - Logout and invalidate token
POST   /api/auth/refresh           - Refresh JWT token
POST   /api/auth/password-reset    - Request password reset
POST   /api/auth/password-reset/:token - Complete password reset
```

**Paper Endpoints:**
```
GET    /api/papers                 - List user's papers (paginated)
POST   /api/papers                 - Add new paper
GET    /api/papers/:id             - Get paper details
PUT    /api/papers/:id             - Update paper
DELETE /api/papers/:id             - Delete paper
GET    /api/papers/:id/connections - Get connected papers
GET    /api/papers/:id/citations   - Get citation relationships
GET    /api/papers/:id/recommendations - Get recommendations
POST   /api/papers/import          - Bulk import papers
GET    /api/papers/search          - Search papers
```

**Note Endpoints:**
```
GET    /api/papers/:id/notes       - Get notes for paper
POST   /api/papers/:id/notes       - Create note
PUT    /api/notes/:id              - Update note
DELETE /api/notes/:id              - Delete note
```

**Insight Endpoints:**
```
GET    /api/papers/:id/insights    - Get insights for paper
POST   /api/papers/:id/insights    - Create insight
PUT    /api/insights/:id           - Update insight
DELETE /api/insights/:id           - Delete insight
GET    /api/insights/search        - Search insights by tag
```

**Idea Endpoints:**
```
GET    /api/ideas                  - List user's ideas
POST   /api/ideas                  - Create idea
GET    /api/ideas/:id              - Get idea details
PUT    /api/ideas/:id              - Update idea
DELETE /api/ideas/:id              - Delete idea
POST   /api/ideas/:id/papers       - Add paper reference to idea
DELETE /api/ideas/:id/papers/:paperId - Remove paper reference
```

**Collection Endpoints:**
```
GET    /api/collections            - List user's collections
POST   /api/collections            - Create collection
GET    /api/collections/:id        - Get collection details
PUT    /api/collections/:id        - Update collection
DELETE /api/collections/:id        - Delete collection
POST   /api/collections/:id/papers - Add paper to collection
DELETE /api/collections/:id/papers/:paperId - Remove paper
GET    /api/collections/:id/stats  - Get collection statistics
POST   /api/collections/:id/share  - Share collection
```

**Stats Endpoints:**
```
GET    /api/stats/dashboard        - Get dashboard statistics
GET    /api/stats/weekly           - Get weekly statistics
GET    /api/stats/trends           - Get historical trends
GET    /api/stats/badges           - Get earned badges
```

**Search Endpoints:**
```
GET    /api/search                 - Full-text search
GET    /api/search/advanced        - Advanced search with filters
POST   /api/search/saved           - Save search query
GET    /api/search/saved           - List saved searches
```

**Export Endpoints:**
```
POST   /api/export                 - Request data export
GET    /api/export/:id             - Download export file
GET    /api/export/status/:id      - Check export status
```

### Request/Response Format

**Standard Request:**
```json
{
  "title": "Machine Learning Fundamentals",
  "authors": ["John Doe", "Jane Smith"],
  "abstract": "A comprehensive overview...",
  "doi": "10.1234/example",
  "url": "https://example.com/paper",
  "publication_date": "2023-01-15",
  "venue": "Journal of ML",
  "field": "Machine Learning"
}
```

**Standard Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "paper_123",
    "title": "Machine Learning Fundamentals",
    "authors": ["John Doe", "Jane Smith"],
    "created_at": "2023-12-01T10:30:00Z",
    "updated_at": "2023-12-01T10:30:00Z"
  },
  "meta": {
    "timestamp": "2023-12-01T10:30:00Z"
  }
}
```

**Standard Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid paper metadata",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2023-12-01T10:30:00Z"
  }
}
```

**Pagination:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Handling

**HTTP Status Codes:**
- 200 OK: Successful request
- 201 Created: Resource created
- 204 No Content: Successful deletion
- 400 Bad Request: Invalid input
- 401 Unauthorized: Missing/invalid authentication
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource not found
- 409 Conflict: Duplicate resource
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error
- 503 Service Unavailable: Service temporarily down

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

**Common Error Codes:**
- VALIDATION_ERROR: Input validation failed
- AUTHENTICATION_REQUIRED: User not authenticated
- PERMISSION_DENIED: User lacks permission
- RESOURCE_NOT_FOUND: Resource doesn't exist
- DUPLICATE_RESOURCE: Resource already exists
- RATE_LIMIT_EXCEEDED: Too many requests
- EXTERNAL_API_ERROR: External service failed
- DATABASE_ERROR: Database operation failed
- INTERNAL_ERROR: Unexpected server error


## Security Architecture

### Authentication Flow

**Email/Password Authentication:**
```
1. User submits email + password
2. Server validates credentials against bcrypt hash
3. Server generates JWT token (30-day expiry)
4. Server returns token to client
5. Client stores token in secure HTTP-only cookie
6. Client includes token in Authorization header for subsequent requests
7. Server validates token signature and expiry on each request
```

**OAuth2 Authentication (GitHub/Google):**
```
1. User clicks "Login with GitHub/Google"
2. Client redirects to OAuth provider
3. User authorizes application
4. OAuth provider redirects to callback URL with authorization code
5. Server exchanges code for access token
6. Server fetches user profile from OAuth provider
7. Server creates/updates user in database
8. Server generates JWT token
9. Server redirects to client with token
```

**Token Refresh:**
```
1. Client detects token expiry (or receives 401)
2. Client sends refresh token to /api/auth/refresh
3. Server validates refresh token
4. Server generates new JWT token
5. Client retries original request with new token
```

### Authorization Model

**Role-Based Access Control (RBAC):**
- User: Standard user (default)
- Admin: Platform administrator (manage users, view analytics)
- Moderator: Community moderator (manage shared collections)

**Resource-Level Permissions:**
- Papers: User can only access their own papers
- Collections: User can access own collections; shared collections have read-only or collaborative access
- Notes/Insights/Ideas: User can only access their own
- Badges: User can only view their own

**Permission Checks:**
```
For each request:
  1. Extract user_id from JWT token
  2. Extract resource_id from request
  3. Query database for resource ownership
  4. If user_id matches owner_id, allow
  5. If resource is shared, check sharing permissions
  6. Otherwise, return 403 Forbidden
```

### Encryption

**At Rest:**
- Database: AES-256 encryption for sensitive fields (password hashes, API keys)
- Backups: Encrypted with master key
- Implementation: Use database-level encryption (PostgreSQL pgcrypto) or application-level encryption

**In Transit:**
- TLS 1.3 for all HTTP connections
- HSTS header to enforce HTTPS
- Certificate: Let's Encrypt (free, auto-renewal)

**Password Hashing:**
- Algorithm: bcrypt with salt rounds = 12
- Never store plaintext passwords
- Use constant-time comparison for verification

### API Security

**Rate Limiting:**
```
Per user:
- 1000 requests per hour (general)
- 100 requests per minute (auth endpoints)
- 10 requests per minute (export endpoints)

Per IP:
- 10,000 requests per hour (general)
- 1000 requests per minute (auth endpoints)

Implementation: Redis-backed rate limiter
```

**CORS (Cross-Origin Resource Sharing):**
```
Allowed origins: Configured per environment
  - Development: http://localhost:3000
  - Production: https://app.example.com
Allowed methods: GET, POST, PUT, DELETE, OPTIONS
Allowed headers: Content-Type, Authorization
Credentials: true (allow cookies)
```

**CSRF Protection:**
- Use SameSite cookie attribute (Strict)
- Validate Origin header
- Use CSRF tokens for state-changing operations

**Input Validation:**
- Validate all user inputs on server side
- Sanitize HTML/Markdown to prevent XSS
- Use parameterized queries to prevent SQL injection
- Validate file uploads (type, size, content)

### Data Privacy

**GDPR Compliance:**
- Right to access: Provide data export
- Right to deletion: Delete all user data within 30 days
- Right to portability: Export in standard format (JSON)
- Consent management: Track user consent for data processing
- Data retention: Delete inactive accounts after 2 years

**CCPA Compliance:**
- Right to know: Provide data export
- Right to delete: Delete all user data within 45 days
- Right to opt-out: Disable data sharing
- Disclosure: Privacy policy with clear data practices

**Data Minimization:**
- Collect only necessary data
- Don't store full PDF content (store metadata only)
- Don't track user behavior beyond usage analytics
- Anonymize analytics data

### Security Audit

**Quarterly Security Audits:**
- Penetration testing
- Dependency vulnerability scanning
- Code review for security issues
- Infrastructure security assessment

**Continuous Monitoring:**
- Monitor for suspicious login patterns
- Alert on failed authentication attempts
- Track API usage anomalies
- Monitor database access logs


## Performance Considerations

### Caching Strategy

**Multi-Level Caching:**

**Level 1: Application Cache (Redis)**
- Individual papers: 1-hour TTL
- User's paper list: 30-minute TTL
- Search results: 5-minute TTL
- Connections: 24-hour TTL
- Recommendations: 1-hour TTL
- User sessions: 30-day TTL

**Level 2: Database Query Cache**
- Prepared statements for common queries
- Connection pooling (max 20 connections)
- Query result caching at ORM level

**Level 3: HTTP Caching**
- Static assets: 1-year cache (with versioning)
- API responses: Cache-Control headers based on data freshness
- ETags for conditional requests

**Cache Invalidation:**
```
On paper update:
  - Invalidate paper cache
  - Invalidate user's paper list cache
  - Invalidate search result cache
  - Invalidate connection cache
  - Invalidate recommendation cache

On note/insight update:
  - Invalidate paper cache (includes notes/insights)
  - Invalidate search result cache
```

### Database Indexing Strategy

**Primary Indexes:**
- All primary keys (automatic)
- All foreign keys (for joins)

**Search Indexes:**
- Full-text index: (title, abstract, authors)
- B-tree index: (user_id, created_at) for user's papers
- B-tree index: (doi) for duplicate detection
- B-tree index: (field) for field filtering

**Connection Indexes:**
- B-tree index: (paper_id_1, confidence_score) for neighbor queries
- B-tree index: (paper_id_2, confidence_score) for reverse queries

**Citation Indexes:**
- B-tree index: (citing_paper_id) for outgoing citations
- B-tree index: (cited_paper_id) for incoming citations

**Partitioning:**
- Papers: Partition by user_id (range partitioning)
- Notes: Partition by paper_id (range partitioning)
- Connections: Partition by paper_id_1 (range partitioning)

### Async Processing

**Job Queue (Bull/Celery):**

**High Priority (< 1 minute):**
- Duplicate detection
- Field classification
- Metadata validation

**Medium Priority (< 5 minutes):**
- Metadata fetching from external APIs
- Connection discovery
- Citation extraction

**Low Priority (< 1 hour):**
- Recommendation generation
- Stats aggregation
- Badge achievement calculation
- Data export

**Job Configuration:**
```
Concurrency: 10 workers per job type
Retry: 3 attempts with exponential backoff
Timeout: 30 seconds per job
Dead letter queue: Failed jobs for manual review
```

### Query Optimization

**Common Query Patterns:**

**Get user's papers (paginated):**
```sql
SELECT * FROM papers 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```
- Index: (user_id, created_at)
- Expected: < 50ms for 10,000 papers

**Get paper with connections:**
```sql
SELECT p.*, c.confidence_score, c.reason
FROM papers p
LEFT JOIN connections c ON (p.id = c.paper_id_1 OR p.id = c.paper_id_2)
WHERE p.id = $1 AND c.confidence_score >= 60;
```
- Index: (paper_id_1, confidence_score), (paper_id_2, confidence_score)
- Expected: < 100ms

**Full-text search:**
```sql
SELECT * FROM papers 
WHERE user_id = $1 
AND (title @@ to_tsquery($2) OR abstract @@ to_tsquery($2))
LIMIT 20;
```
- Index: Full-text index on (title, abstract)
- Expected: < 200ms

### Scalability Approach

**Horizontal Scaling:**
- Stateless API servers: Scale behind load balancer
- Database: Read replicas for read-heavy queries
- Cache: Redis cluster for distributed caching
- Search: Elasticsearch cluster for distributed indexing

**Load Balancing:**
- Round-robin for API servers
- Sticky sessions for WebSocket connections
- Health checks every 10 seconds

**Database Scaling:**
- Primary-replica replication for reads
- Connection pooling to limit connections
- Query optimization to reduce load
- Partitioning to distribute data

**Monitoring and Alerting:**
- CPU usage > 80%: Scale up
- Memory usage > 85%: Scale up
- Response time > 1s: Investigate
- Error rate > 1%: Alert
- Database connections > 80% of max: Alert

### Performance Targets

**Response Times:**
- Paper retrieval: < 50ms
- Paper list (paginated): < 100ms
- Search: < 500ms
- Recommendations: < 1s (cached)
- Dashboard: < 2s

**Throughput:**
- Paper ingestion: 1000 papers/minute
- API requests: 10,000 requests/second
- Concurrent users: 100,000

**Availability:**
- Uptime: 99.5% (4.38 hours downtime/month)
- Recovery time: < 5 minutes
- Data loss: 0 (ACID guarantees)


## Deployment Architecture

### Self-Hosted Deployment (Docker Compose)

**Development Environment:**
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/research_tracker
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - postgres
      - redis
      - elasticsearch
    volumes:
      - ./backend:/app
      - /app/node_modules

  web:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
    depends_on:
      - api
    volumes:
      - ./frontend:/app
      - /app/node_modules

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=research_tracker
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

**Production Environment:**
```yaml
version: '3.8'
services:
  api:
    image: research-tracker:latest
    replicas: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres-primary:5432/research_tracker
      - REDIS_URL=redis://redis-cluster:6379
      - ELASTICSEARCH_URL=http://elasticsearch-cluster:9200
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

  postgres-primary:
    image: postgres:15-alpine
    environment:
      - POSTGRES_REPLICATION_MODE=master
    volumes:
      - postgres_primary_data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15-alpine
    environment:
      - POSTGRES_REPLICATION_MODE=slave
    depends_on:
      - postgres-primary

  redis-cluster:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
    volumes:
      - redis_cluster_data:/data

  elasticsearch-cluster:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.seed_hosts=elasticsearch-node2,elasticsearch-node3
      - cluster.initial_master_nodes=elasticsearch-cluster,elasticsearch-node2,elasticsearch-node3
    volumes:
      - elasticsearch_cluster_data:/usr/share/elasticsearch/data
```

### Cloud Deployment (AWS)

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              CloudFront (CDN)                            │
│         (Static assets, caching)                         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│         Application Load Balancer (ALB)                  │
│         (HTTPS, SSL termination)                         │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼────────┐ ┌────▼────────┐
│  ECS Cluster   │ │  ECS Cluster │ │  ECS Cluster │
│  (API Servers) │ │  (API Servers)│ │  (API Servers)│
│  (3 instances) │ │  (3 instances)│ │  (3 instances)│
└────────────────┘ └──────────────┘ └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼────────┐ ┌────▼────────┐
│  RDS Aurora    │ │  ElastiCache │ │  Elasticsearch
│  (PostgreSQL)  │ │  (Redis)     │ │  (Managed)
│  (Multi-AZ)    │ │  (Cluster)   │ │  (Cluster)
└────────────────┘ └──────────────┘ └──────────────┘
        │
┌───────▼────────────────────────────────────────┐
│  S3 (Backups, Exports, Static Assets)          │
└────────────────────────────────────────────────┘
```

**AWS Services:**
- ECS Fargate: Container orchestration (serverless)
- RDS Aurora: Managed PostgreSQL with auto-scaling
- ElastiCache: Managed Redis cluster
- Elasticsearch Service: Managed Elasticsearch
- S3: Object storage for backups and exports
- CloudFront: CDN for static assets
- Route 53: DNS management
- CloudWatch: Monitoring and logging
- SNS: Notifications for alerts

### Database Migration Strategy

**Initial Setup:**
```bash
# 1. Create database
createdb research_tracker

# 2. Run migrations
npm run migrate:latest

# 3. Seed initial data (fields, badge types)
npm run seed:initial
```

**Migration Process:**
```bash
# 1. Create migration file
npm run migrate:create add_new_column

# 2. Write migration (up and down)
# migrations/001_add_new_column.js

# 3. Test migration locally
npm run migrate:test

# 4. Deploy to staging
npm run migrate:staging

# 5. Verify data integrity
npm run verify:staging

# 6. Deploy to production
npm run migrate:production

# 7. Monitor for issues
npm run monitor:migration
```

**Rollback Strategy:**
```bash
# If migration fails:
npm run migrate:rollback

# Verify rollback
npm run verify:rollback

# Investigate issue
# Fix migration
# Retry
```

### Backup and Recovery

**Backup Strategy:**
- Daily full backups to S3
- Hourly incremental backups
- 30-day retention
- Cross-region replication

**Backup Process:**
```bash
# Daily full backup
0 2 * * * pg_dump research_tracker | gzip | aws s3 cp - s3://backups/daily/$(date +%Y%m%d).sql.gz

# Hourly incremental backup
0 * * * * pg_basebackup -D /backups/incremental/$(date +%Y%m%d_%H%M%S) -Ft -z
```

**Recovery Process:**
```bash
# 1. Identify backup to restore
aws s3 ls s3://backups/daily/

# 2. Download backup
aws s3 cp s3://backups/daily/20231201.sql.gz .

# 3. Restore database
gunzip -c 20231201.sql.gz | psql research_tracker

# 4. Verify data integrity
npm run verify:restore

# 5. Resume service
npm run start
```

**Recovery Time Objectives (RTO):**
- Full database restore: < 1 hour
- Partial data restore: < 30 minutes
- Service resumption: < 5 minutes after restore

**Recovery Point Objectives (RPO):**
- Maximum data loss: 1 hour (hourly backups)
- Acceptable for most use cases


## Error Handling

### Error Categories

**Validation Errors (400):**
- Missing required fields
- Invalid field formats
- Constraint violations
- File upload errors

**Authentication Errors (401):**
- Missing authentication token
- Invalid token signature
- Expired token
- Invalid credentials

**Authorization Errors (403):**
- User lacks permission
- Resource not owned by user
- Insufficient role privileges

**Not Found Errors (404):**
- Paper not found
- User not found
- Collection not found
- Resource deleted

**Conflict Errors (409):**
- Duplicate paper (same DOI)
- Duplicate collection name
- Concurrent modification

**Rate Limit Errors (429):**
- Too many requests
- API quota exceeded

**External Service Errors (502/503):**
- Crossref API unavailable
- Semantic Scholar API unavailable
- Elasticsearch unavailable
- Database unavailable

**Internal Errors (500):**
- Unexpected exceptions
- Database errors
- File system errors

### Error Recovery Strategies

**Transient Errors (Retry):**
- Network timeouts: Retry with exponential backoff (3 attempts)
- External API failures: Retry with 5-second delay
- Database connection errors: Retry with connection pool reset

**Permanent Errors (Fail Fast):**
- Validation errors: Return immediately with details
- Authentication errors: Return immediately
- Authorization errors: Return immediately

**Graceful Degradation:**
- Elasticsearch unavailable: Fall back to PostgreSQL full-text search
- Redis unavailable: Disable caching, use database directly
- External APIs unavailable: Allow manual entry, skip auto-fetch
- Recommendations unavailable: Show empty recommendations

### Logging and Monitoring

**Log Levels:**
- ERROR: Errors that need immediate attention
- WARN: Warnings about potential issues
- INFO: General informational messages
- DEBUG: Detailed debugging information

**Log Format:**
```json
{
  "timestamp": "2023-12-01T10:30:00Z",
  "level": "ERROR",
  "service": "paper-service",
  "message": "Failed to fetch metadata",
  "error": {
    "code": "EXTERNAL_API_ERROR",
    "message": "Crossref API returned 503",
    "stack": "..."
  },
  "context": {
    "user_id": "user_123",
    "paper_id": "paper_456",
    "doi": "10.1234/example"
  },
  "request_id": "req_789"
}
```

**Monitoring Alerts:**
- Error rate > 1%: Alert
- Response time > 2s: Alert
- Database connections > 80%: Alert
- Cache hit rate < 50%: Alert
- External API failures: Alert
- Disk space < 10%: Alert


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Paper Metadata Completeness

*For any* paper added to the system via URL, DOI, or manual entry, all required fields (title, authors, abstract, publication date) SHALL be present in the stored paper record.

**Validates: Requirements 1.1, 1.5, 2.1**

### Property 2: Duplicate Detection Prevents Duplicates

*For any* paper already in the system, attempting to add a paper with the same DOI SHALL result in rejection and notification to the user, preventing duplicate entries.

**Validates: Requirements 1.6**

### Property 3: Paper Retrieval Performance

*For any* user with up to 10,000 papers in their collection, querying their papers SHALL return results within 200 milliseconds.

**Validates: Requirements 2.2**

### Property 4: Timestamp Preservation on Update

*For any* paper that is updated, the creation timestamp SHALL remain unchanged while the modification timestamp SHALL be updated to reflect the change time.

**Validates: Requirements 2.4**

### Property 5: Full-Text Search Indexing

*For any* paper with specific keywords in title, abstract, or author names, searching for those keywords SHALL return that paper in the results.

**Validates: Requirements 2.5, 3.5, 4.5**

### Property 6: Note Association and Retrieval

*For any* note created for a paper, retrieving that paper SHALL include all associated notes with their content and timestamps.

**Validates: Requirements 3.1, 3.3, 3.4**

### Property 7: Rich Text Preservation

*For any* note created with rich text formatting (bold, italic, lists, code blocks), retrieving that note SHALL preserve the formatting exactly as entered.

**Validates: Requirements 3.2**

### Property 8: Insight Categorization and Retrieval

*For any* insight created with a category tag, searching for insights by that tag SHALL return that insight in the results.

**Validates: Requirements 4.2, 4.5**

### Property 9: Insight Export Completeness

*For any* collection of papers with associated insights, exporting that collection SHALL include all insights with their content and categories.

**Validates: Requirements 4.4**

### Property 10: Idea Multi-Paper References

*For any* idea that references multiple papers, retrieving that idea SHALL return all referenced papers in the response.

**Validates: Requirements 5.3, 5.4**

### Property 11: Idea Status Tracking

*For any* idea with a status (brainstorm, in progress, published, abandoned), updating the status SHALL persist the new status and retrieving the idea SHALL return the updated status.

**Validates: Requirements 5.5**

### Property 12: Connection Confidence Scoring

*For any* connection between two papers, the confidence score SHALL be a number between 0 and 100 inclusive.

**Validates: Requirements 6.3**

### Property 13: Connection Filtering by Confidence

*For any* paper, retrieving its connections SHALL only return connections with confidence scores of 60 or higher.

**Validates: Requirements 6.4**

### Property 14: Connection Ranking by Confidence

*For any* paper with multiple connections, retrieving its connections SHALL return them sorted in descending order by confidence score.

**Validates: Requirements 6.5**

### Property 15: Connection Discovery on Paper Addition

*For any* new paper added to the system, the system SHALL identify and create connections to existing papers with similar metadata (authors, keywords, field) within 5 minutes.

**Validates: Requirements 6.1, 6.2, 6.6**

### Property 16: Citation Extraction and Storage

*For any* paper ingested with citation data available, the system SHALL extract and store all cited papers as citation relationships.

**Validates: Requirements 7.1**

### Property 17: Citation Relationship Retrieval

*For any* paper, retrieving its citations SHALL return both papers it cites and papers that cite it.

**Validates: Requirements 7.2**

### Property 18: Citation Graph Validity

*For any* set of papers with citation relationships, the citation graph SHALL form a valid directed acyclic graph (DAG) with no cycles.

**Validates: Requirements 7.3**

### Property 19: Graceful Degradation on Missing Citations

*For any* paper where citation data is unavailable from external sources, the system SHALL still allow the paper to be stored and retrieved with available metadata.

**Validates: Requirements 7.4**

### Property 20: Recommendation Exclusion of Existing Papers

*For any* user viewing a paper, the recommendations returned SHALL NOT include papers already in that user's collection.

**Validates: Requirements 8.6**

### Property 21: Recommendation Ranking by Relevance

*For any* paper with multiple recommendations, the recommendations returned SHALL be sorted in descending order by relevance score.

**Validates: Requirements 8.4**

### Property 22: Weekly Stats Accuracy

*For any* user, the weekly stats SHALL correctly count papers added in the current calendar week and break them down by field.

**Validates: Requirements 9.1, 9.2**

### Property 23: Reading Streak Calculation

*For any* user with papers added on consecutive days, the reading streak SHALL correctly count the number of consecutive days with at least one paper added.

**Validates: Requirements 9.4**

### Property 24: Historical Trends Calculation

*For any* user, the historical trends SHALL correctly calculate papers read per week for the past 12 weeks.

**Validates: Requirements 9.5**

### Property 25: Milestone Badge Award

*For any* user reaching a milestone (first paper, 10 papers, 50 papers, 100 papers), the system SHALL award the corresponding badge.

**Validates: Requirements 10.1**

### Property 26: Field Exploration Badge Award

*For any* user with papers in 5 or more different fields, the system SHALL award the field exploration badge.

**Validates: Requirements 10.2**

### Property 27: Author Tracking Badge Award

*For any* user with papers from 10 or more different authors, the system SHALL award the author tracking badge.

**Validates: Requirements 10.3**

### Property 28: Insight Capture Badge Award

*For any* user with 10 or more insights, the system SHALL award the insight capture badge.

**Validates: Requirements 10.4**

### Property 29: Badge Display on Profile

*For any* user with earned badges, retrieving their profile SHALL display all earned badges with their earned timestamps.

**Validates: Requirements 10.5, 10.6**

### Property 30: Collection Creation and Storage

*For any* collection created by a user with a name and optional description, retrieving that collection SHALL return the name and description exactly as provided.

**Validates: Requirements 11.1**

### Property 31: Paper-Collection Association

*For any* paper added to a collection, retrieving that collection SHALL include that paper in its paper list.

**Validates: Requirements 11.2**

### Property 32: Multi-Collection Paper Membership

*For any* paper added to multiple collections, retrieving each collection SHALL include that paper in its paper list.

**Validates: Requirements 11.3**

### Property 33: Collection Statistics Accuracy

*For any* collection, the collection statistics SHALL correctly count papers, unique fields, and unique authors in that collection.

**Validates: Requirements 11.5**

### Property 34: Search Performance

*For any* user with up to 10,000 papers, executing a search query SHALL return results within 500 milliseconds.

**Validates: Requirements 12.1**

### Property 35: Search Filtering by Field

*For any* search query with a field filter, all returned papers SHALL belong to the specified field.

**Validates: Requirements 12.2**

### Property 36: Boolean Search Operators

*For any* search query using AND, OR, NOT operators, the results SHALL correctly apply the boolean logic to filter papers.

**Validates: Requirements 12.3**

### Property 37: Search Result Sorting

*For any* search query with a sort option (relevance, date added, publication date, citation count), results SHALL be sorted according to the specified criterion.

**Validates: Requirements 12.4**

### Property 38: Saved Search Retrieval

*For any* search query saved by a user, retrieving and re-running that saved search SHALL return the same results as the original search.

**Validates: Requirements 12.5**

### Property 39: Password Validation

*For any* password that does not meet requirements (minimum 8 characters, at least one uppercase, one lowercase, one number), account creation SHALL be rejected.

**Validates: Requirements 13.4**

### Property 40: JWT Token Expiry

*For any* JWT token issued at login, the token SHALL expire exactly 30 days after issuance and subsequent API requests with that token SHALL be rejected with 401 Unauthorized.

**Validates: Requirements 13.3**

### Property 41: Token Invalidation on Logout

*For any* user who logs out, subsequent API requests using their previous token SHALL be rejected with 401 Unauthorized.

**Validates: Requirements 13.5**

### Property 42: Data Export Completeness

*For any* user requesting a full data export, the export SHALL include all papers, notes, insights, ideas, and collections belonging to that user.

**Validates: Requirements 14.1, 14.2**

### Property 43: Export Format Validity

*For any* data export, the exported file SHALL be valid JSON that can be parsed and contains all required fields.

**Validates: Requirements 14.1**

### Property 44: Export Performance

*For any* user with up to 10,000 papers, requesting a data export SHALL complete within 5 minutes.

**Validates: Requirements 14.5**

### Property 45: API Authentication Requirement

*For any* API request without valid authentication (API key or OAuth2 token), the request SHALL be rejected with 401 Unauthorized.

**Validates: Requirements 15.2**

### Property 46: API CRUD Operations

*For any* paper created via API, retrieving that paper via API SHALL return the same data, and updating/deleting via API SHALL persist the changes.

**Validates: Requirements 15.3**

### Property 47: API Rate Limiting

*For any* user exceeding 1000 API requests per hour, subsequent requests SHALL be rejected with 429 Too Many Requests.

**Validates: Requirements 15.5**

### Property 48: API Response Format

*For any* API response, the response SHALL be valid JSON with appropriate HTTP status codes (200 for success, 4xx for client errors, 5xx for server errors).

**Validates: Requirements 15.6**

### Property 49: Graceful Degradation Under Load

*For any* system experiencing high load, non-critical features (recommendations, connections) MAY be temporarily unavailable while critical features (paper retrieval, search) remain functional.

**Validates: Requirements 16.5**

### Property 50: Sensitive Data Encryption

*For any* sensitive user data (passwords, API keys), the data SHALL be encrypted and not stored in plaintext in the database.

**Validates: Requirements 17.1**

### Property 51: TLS Encryption in Transit

*For any* API request over HTTPS, the connection SHALL use TLS 1.3 or higher.

**Validates: Requirements 17.2**

### Property 52: Account Deletion Data Removal

*For any* user who deletes their account, all their papers, notes, insights, ideas, and collections SHALL be permanently deleted from the system within 30 days.

**Validates: Requirements 17.4**

### Property 53: Metadata Fetching from Crossref

*For any* paper with a valid DOI, the system SHALL fetch metadata from Crossref API and populate title, authors, abstract, and publication date.

**Validates: Requirements 19.1**

### Property 54: Metadata Fetching Fallback

*For any* paper where primary metadata sources are unavailable, the system SHALL allow manual entry of required fields.

**Validates: Requirements 19.4, 19.6**

### Property 55: Metadata Caching

*For any* paper metadata fetched from external APIs, subsequent requests for the same paper within 24 hours SHALL use cached metadata without calling external APIs.

**Validates: Requirements 19.5**

### Property 56: Automatic Field Classification

*For any* paper added to the system, the system SHALL automatically assign it to one or more research fields based on metadata.

**Validates: Requirements 20.1, 20.2**

### Property 57: Manual Field Override

*For any* paper with an automatically assigned field, a user SHALL be able to manually change the field assignment and the change SHALL persist.

**Validates: Requirements 20.3**

### Property 58: Custom Field Support

*For any* user, they SHALL be able to create custom research fields and assign papers to those custom fields.

**Validates: Requirements 20.5**

### Property 59: Field Classification Accuracy

*For any* set of papers with known fields, the automatic field classification SHALL achieve at least 85% accuracy (precision and recall combined).

**Validates: Requirements 20.6**


## Testing Strategy

### Dual Testing Approach

The Research Paper Tracker employs both unit testing and property-based testing to ensure comprehensive correctness:

**Unit Tests** verify specific examples, edge cases, and error conditions:
- Specific paper ingestion scenarios (valid DOI, invalid URL, missing fields)
- Edge cases (empty collections, single paper, maximum field lengths)
- Error conditions (API failures, database errors, authentication failures)
- Integration points between services

**Property-Based Tests** verify universal properties across all inputs:
- For any paper, metadata is stored and retrieved correctly
- For any search query, results are returned within performance targets
- For any user action, data integrity is maintained
- For any connection, confidence scores are valid and consistent

### Unit Testing Strategy

**Test Coverage by Service:**

**Auth Service:**
- Valid email/password registration
- Invalid password rejection (too short, no uppercase, etc.)
- OAuth2 login flow
- Token generation and validation
- Token expiry and refresh
- Password reset flow
- Concurrent login handling

**Paper Service:**
- Create paper with valid metadata
- Create paper with missing required fields (rejected)
- Update paper preserves creation timestamp
- Delete paper removes all associations
- Duplicate detection by DOI
- Duplicate detection by title + authors
- Paper retrieval performance (< 50ms)

**Ingestion Service:**
- Fetch metadata from Crossref API
- Fetch metadata from Semantic Scholar API
- Extract metadata from PDF
- Fallback to manual entry on API failure
- Validate required fields
- Handle malformed URLs
- Handle invalid DOIs

**Search Service:**
- Full-text search on title
- Full-text search on abstract
- Full-text search on authors
- Full-text search on notes
- Filter by field
- Filter by author
- Filter by publication year
- Sort by relevance
- Sort by date added
- Boolean operators (AND, OR, NOT)
- Search performance (< 500ms)

**Connection Engine:**
- Identify similar papers by shared authors
- Identify similar papers by keyword overlap
- Identify similar papers by citation relationships
- Assign confidence scores (0-100)
- Filter connections by confidence threshold (>= 60)
- Rank connections by confidence score
- Incremental updates on new paper addition

**Recommendation Engine:**
- Suggest related papers (connection-based)
- Suggest cited papers
- Suggest citing papers
- Rank recommendations by relevance
- Exclude papers already in collection
- Handle empty recommendation cases

**Stats Engine:**
- Calculate weekly paper count
- Calculate papers by field
- Calculate top authors
- Calculate reading streak
- Calculate historical trends
- Detect milestones
- Award badges

**Collection Service:**
- Create collection with name and description
- Add paper to collection
- Add paper to multiple collections
- Remove paper from collection
- Delete collection
- Calculate collection statistics
- Share collection with other users

**Note Service:**
- Create note with rich text
- Preserve formatting (bold, italic, lists, code blocks)
- Associate note with paper
- Retrieve all notes for paper
- Update note content
- Delete note

**Insight Service:**
- Create insight with category
- Tag insight with multiple categories
- Retrieve insights for paper
- Search insights by tag
- Export insights
- Update insight content

**Idea Service:**
- Create idea with title and description
- Link idea to source paper
- Add multiple paper references
- Update idea status
- Retrieve all papers referenced by idea
- Delete idea

### Property-Based Testing Strategy

**Testing Framework:** fast-check (JavaScript) or Hypothesis (Python)

**Configuration:**
- Minimum 100 iterations per property test
- Seed-based reproducibility for failures
- Timeout: 30 seconds per test
- Shrinking enabled for minimal failing examples

**Property Test Structure:**

```javascript
// Example property test for paper metadata completeness
describe('Paper Metadata Completeness', () => {
  it('Property 1: For any paper added via DOI, all required fields are present', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          authors: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
          abstract: fc.string({ minLength: 1 }),
          doi: fc.string({ minLength: 1 }),
          publicationDate: fc.date(),
          venue: fc.string({ minLength: 1 })
        }),
        async (paperData) => {
          // Add paper
          const paper = await paperService.addPaper(paperData);
          
          // Retrieve paper
          const retrieved = await paperService.getPaper(paper.id);
          
          // Verify all fields are present
          expect(retrieved.title).toBe(paperData.title);
          expect(retrieved.authors).toEqual(paperData.authors);
          expect(retrieved.abstract).toBe(paperData.abstract);
          expect(retrieved.doi).toBe(paperData.doi);
          expect(retrieved.publicationDate).toEqual(paperData.publicationDate);
          expect(retrieved.venue).toBe(paperData.venue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Categories:**

**Invariant Properties:**
- Paper metadata is immutable after creation (except updates)
- Connection confidence scores are always 0-100
- Reading streak never decreases
- Badge count never decreases
- Collection paper count matches actual papers

**Round-Trip Properties:**
- Add paper → Retrieve paper → Data matches
- Create note → Retrieve note → Content matches
- Export data → Import data → Data matches
- Serialize paper → Deserialize paper → Equivalent

**Idempotence Properties:**
- Adding same paper twice → Only one paper stored
- Updating paper with same data → No change
- Applying field classification twice → Same result
- Calculating stats twice → Same result

**Metamorphic Properties:**
- Papers in collection <= Total papers
- Connection count <= Papers * (Papers - 1) / 2
- Recommendation count <= Total papers - Papers in collection
- Badge count <= Total possible badges

**Error Condition Properties:**
- Invalid input → Rejected with error
- Missing required field → Rejected with error
- Duplicate paper → Rejected with error
- Unauthorized access → Rejected with 403
- Rate limit exceeded → Rejected with 429

### Test Execution

**Local Development:**
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run property tests only
npm run test:property

# Run specific test file
npm test -- paper.test.js

# Run with coverage
npm run test:coverage
```

**CI/CD Pipeline:**
```bash
# Run all tests with coverage
npm run test:ci

# Generate coverage report
npm run coverage:report

# Upload to coverage service
npm run coverage:upload
```

**Performance Testing:**
```bash
# Run performance benchmarks
npm run test:performance

# Load testing (1000 concurrent users)
npm run test:load

# Stress testing (gradual load increase)
npm run test:stress
```

### Test Data Management

**Fixtures:**
- Sample papers with various metadata
- Sample users with different roles
- Sample collections with papers
- Sample notes, insights, ideas

**Generators (for property tests):**
- Random paper metadata
- Random user data
- Random search queries
- Random timestamps
- Random field classifications

**Database Seeding:**
```bash
# Seed test database with fixtures
npm run seed:test

# Clear test database
npm run db:clear:test

# Reset test database
npm run db:reset:test
```

### Coverage Targets

**Unit Test Coverage:**
- Line coverage: >= 80%
- Branch coverage: >= 75%
- Function coverage: >= 80%

**Property Test Coverage:**
- All testable acceptance criteria covered
- All error conditions covered
- All edge cases covered

### Continuous Integration

**GitHub Actions Workflow:**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run coverage:upload
      - run: npm run lint
      - run: npm run type-check
```

### Test Maintenance

**Regular Review:**
- Monthly review of test coverage
- Quarterly review of test performance
- Annual review of test strategy

**Flaky Test Management:**
- Track flaky tests
- Investigate root causes
- Fix or remove flaky tests
- Document known issues

**Test Documentation:**
- Document test purpose and approach
- Document test data requirements
- Document expected outcomes
- Document troubleshooting steps
