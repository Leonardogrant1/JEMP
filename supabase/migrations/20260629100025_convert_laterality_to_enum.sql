-- Convert laterality column from text+constraint to enum type

DO $$ BEGIN
  CREATE TYPE laterality AS ENUM ('bilateral', 'unilateral', 'alternating');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_laterality_check;

ALTER TABLE exercises ALTER COLUMN laterality DROP DEFAULT;

DO $$
BEGIN
  IF (SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'exercises' AND column_name = 'laterality') != 'laterality' THEN
    ALTER TABLE exercises
    ALTER COLUMN laterality TYPE laterality USING laterality::laterality;
  END IF;
END $$;

ALTER TABLE exercises
ALTER COLUMN laterality SET DEFAULT 'bilateral';
