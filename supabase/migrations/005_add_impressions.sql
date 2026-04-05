-- Migration: Add impressions column to posts table
-- This allows users to track LinkedIn post performance metrics

ALTER TABLE posts ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN posts.impressions IS 'Number of LinkedIn impressions reported by the user for performance tracking';
