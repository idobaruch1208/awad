-- ============================================================
-- Project Profiles — Onboarding data for each project
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS project_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  company_name          TEXT,
  industry              TEXT,
  target_audience       TEXT,
  content_goals         TEXT,
  brand_voice           TEXT,
  example_posts         JSONB DEFAULT '[]'::jsonb,
  ai_analysis           JSONB,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE TRIGGER project_profiles_updated_at
  BEFORE UPDATE ON project_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE project_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles for projects they are a member of
CREATE POLICY "Members can view project profiles"
  ON project_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_profiles.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Only project owners can insert/update profiles
CREATE POLICY "Owners can insert project profiles"
  ON project_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_profiles.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can update project profiles"
  ON project_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_profiles.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can delete project profiles"
  ON project_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_profiles.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );
