CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  memory_text   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  approved      BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_memories_approved_submitted
  ON memories (approved, submitted_at DESC);
