-- Add laterality column to exercises as enum
-- bilateral:   both sides simultaneously (default)
-- unilateral:  one side at a time, tracked separately (left / right)
-- alternating: alternating left/right, displayed like bilateral in UI
--
-- is_unilateral is kept for backwards compatibility.

-- Create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'laterality') THEN
    CREATE TYPE laterality AS ENUM ('bilateral', 'unilateral', 'alternating');
  END IF;
END $$;

-- Drop old text constraint if present (from earlier text-based version)
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_laterality_check;

-- Add column or convert existing text column to enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'laterality'
  ) THEN
    ALTER TABLE exercises
    ADD COLUMN laterality laterality NOT NULL DEFAULT 'bilateral';
  ELSE
    ALTER TABLE exercises
    ALTER COLUMN laterality TYPE laterality USING laterality::laterality;
    ALTER TABLE exercises
    ALTER COLUMN laterality SET DEFAULT 'bilateral';
  END IF;
END $$;

-- Populate from is_unilateral for rows still at default
UPDATE exercises
SET laterality = 'unilateral'
WHERE is_unilateral = true AND laterality = 'bilateral';
