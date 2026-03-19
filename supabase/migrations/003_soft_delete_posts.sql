-- Add the is_archived column for soft-deletes
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create an index to improve query performance since most queries will filter for is_archived = false
CREATE INDEX IF NOT EXISTS idx_posts_is_archived ON posts (is_archived);
