CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  memory_text   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  approved      BOOLEAN DEFAULT TRUE,
  submitter_ip  TEXT
);

-- Migration: run this on existing databases (safe to re-run)
-- ALTER TABLE memories ADD COLUMN IF NOT EXISTS submitter_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_memories_approved_submitted
  ON memories (approved, submitted_at DESC);
