-- ============================================================
-- AWAD AI Content Engine — Setup post_learnings table
-- ============================================================

CREATE TABLE IF NOT EXISTS post_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    insight TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE post_learnings ENABLE ROW LEVEL SECURITY;

-- Users can only read/write learnings for projects they are members of
CREATE POLICY "Users can view learnings for their projects"
  ON post_learnings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert learnings for their projects"
  ON post_learnings FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete learnings for their projects"
  ON post_learnings FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );
