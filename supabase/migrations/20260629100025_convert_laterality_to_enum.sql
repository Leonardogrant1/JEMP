-- Convert laterality column from text+constraint to enum type

CREATE TYPE laterality AS ENUM ('bilateral', 'unilateral', 'alternating');

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_laterality_check;

ALTER TABLE exercises ALTER COLUMN laterality DROP DEFAULT;

ALTER TABLE exercises
ALTER COLUMN laterality TYPE laterality USING laterality::laterality;

ALTER TABLE exercises
ALTER COLUMN laterality SET DEFAULT 'bilateral';
