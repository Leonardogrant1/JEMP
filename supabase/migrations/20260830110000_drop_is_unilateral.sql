-- Drop the legacy is_unilateral flag; laterality is the single source of truth.
--
-- PROD DEPLOY ORDER: app builds <= 2.0.3 still select is_unilateral in
-- use-session-detail-query — only apply this migration to production once
-- the app release without that column reference is live.

ALTER TABLE exercises DROP COLUMN is_unilateral;
