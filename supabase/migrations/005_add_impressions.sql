-- Migration: Add tracking_id and impressions columns to posts table
-- tracking_id: A 4-digit random number appended to each generated post for LinkedIn cross-referencing
-- impressions: Number of LinkedIn impressions reported by the user

ALTER TABLE posts ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(10) DEFAULT NULL;

COMMENT ON COLUMN posts.impressions IS 'Number of LinkedIn impressions reported by the user for performance tracking';
COMMENT ON COLUMN posts.tracking_id IS 'Random 4-digit tracking ID appended to the post text for LinkedIn cross-referencing';
