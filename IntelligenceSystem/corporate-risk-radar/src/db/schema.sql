CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  text_limited BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_company_hash ON documents(company_id, content_hash);

CREATE TABLE IF NOT EXISTS risk_events (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  category TEXT NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  event_status TEXT NOT NULL,
  is_relevant BOOLEAN NOT NULL,
  event_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '',
  event_date DATE,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  resolution_evidence TEXT NOT NULL DEFAULT '',
  source_quality NUMERIC(4,3) NOT NULL DEFAULT 0.65,
  risk_contribution NUMERIC(8,2) NOT NULL DEFAULT 0,
  duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, document_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_risk_events_company_created ON risk_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_company_key ON risk_events(company_id, event_key);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  risk_index SMALLINT NOT NULL CHECK (risk_index BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL,
  summary TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_company_time ON risk_snapshots(company_id, calculated_at DESC);
