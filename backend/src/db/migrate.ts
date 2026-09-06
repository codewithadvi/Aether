import pool from './pool';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATION = `
-- Enable pgvector for semantic similarity
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  github_id VARCHAR(100),
  google_id VARCHAR(100),
  total_papers_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Papers table with pgvector embedding
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(1000) NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]',
  abstract TEXT,
  doi VARCHAR(255),
  url VARCHAR(2000),
  publication_date DATE,
  venue VARCHAR(500),
  field VARCHAR(255),
  custom_field VARCHAR(255),
  citation_count INTEGER DEFAULT 0,
  pdf_url VARCHAR(2000),
  -- pgvector column: TF-IDF / semantic embedding (384 dims for TF-IDF, or 1536 for OpenAI)
  embedding vector(512),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additive columns for papers (safe to re-run)
ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS methodology JSONB DEFAULT '{
    "architecture": null,
    "data_source": null,
    "metrics": { "accuracy": null, "latency": null, "recall": null }
  }';

CREATE INDEX IF NOT EXISTS idx_papers_external_id ON papers(external_id) WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_user_doi ON papers(user_id, doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_field ON papers(field);
CREATE INDEX IF NOT EXISTS idx_papers_read_at ON papers(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(user_id, created_at DESC);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_papers_fts ON papers USING gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'') || ' ' || coalesce(authors::text,''))
);
-- pgvector index for similarity search
CREATE INDEX IF NOT EXISTS idx_papers_embedding ON papers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_paper_id ON notes(paper_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_paper_id ON insights(paper_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(user_id, category);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'brainstorm' CHECK (status IN ('brainstorm', 'in_progress', 'published', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);

-- Idea → Paper references (many-to-many)
CREATE TABLE IF NOT EXISTS idea_paper_refs (
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (idea_id, paper_id)
);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_shared BOOLEAN DEFAULT false,
  share_mode VARCHAR(20) DEFAULT 'none' CHECK (share_mode IN ('none', 'read_only', 'collaborative')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_share_token ON collections(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Collection collaborators
CREATE TABLE IF NOT EXISTS collection_collaborators (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_collaborators_user_id ON collection_collaborators(user_id);

-- Collection → Paper (many-to-many)
CREATE TABLE IF NOT EXISTS collection_papers (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, paper_id)
);

ALTER TABLE collection_papers
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collection_papers_paper_id ON collection_papers(paper_id);
CREATE INDEX IF NOT EXISTS idx_collection_papers_added_by ON collection_papers(added_by);

-- Connections (similarity between papers)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id_1 UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  paper_id_2 UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paper_id_1, paper_id_2)
);

CREATE INDEX IF NOT EXISTS idx_connections_paper1 ON connections(paper_id_1, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_connections_paper2 ON connections(paper_id_2, confidence_score DESC);

-- Citations (directed relationships)
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  citing_paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  cited_paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  external_doi VARCHAR(255),
  external_title VARCHAR(1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(citing_paper_id, cited_paper_id)
);

CREATE INDEX IF NOT EXISTS idx_citations_citing ON citations(citing_paper_id);
CREATE INDEX IF NOT EXISTS idx_citations_cited ON citations(cited_paper_id);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','papers','notes','insights','ideas','collections','connections'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(MIGRATION);
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
