-- ============================================================
-- AWAD AI Content Engine — Supabase SQL Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Create status enum
CREATE TYPE post_status AS ENUM ('Draft', 'Reviewing', 'Approved', 'Scheduled', 'Published');

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic             TEXT NOT NULL,
  original_draft    TEXT,
  final_text        TEXT,
  image_url         TEXT,
  status            post_status NOT NULL DEFAULT 'Draft',
  target_timestamp  TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  linkedin_post_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LinkedIn credentials table (one row per org)
CREATE TABLE IF NOT EXISTS linkedin_credentials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_urn TEXT NOT NULL,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT,
  expires_at       TIMESTAMPTZ
);

-- Auto-update updated_at on posts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own posts
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- LinkedIn credentials: authenticated users can read; service role writes
CREATE POLICY "Authenticated users can read linkedin_credentials"
  ON linkedin_credentials FOR SELECT
  TO authenticated
  USING (true);
