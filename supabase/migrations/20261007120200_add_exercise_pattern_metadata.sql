-- Exercise pattern metadata for the session structure redesign (spec §1.3).
-- All columns nullable: untagged exercises fall back to the existing
-- BODY_REGION_TO_PATTERN derivation in the generator (spec §6.2c).

CREATE TYPE strength_pattern AS ENUM (
    'push_vertical',
    'push_horizontal',
    'pull_vertical',
    'pull_horizontal',
    'knee_dominant',
    'hinge',
    'rotation'
);

CREATE TYPE plyo_type AS ENUM ('maximal', 'submaximal');

CREATE TYPE core_type AS ENUM ('stability', 'power');

CREATE TYPE sprint_type AS ENUM ('acceleration', 'max_velocity', 'resisted');

ALTER TABLE exercises
    ADD COLUMN strength_pattern strength_pattern,
    ADD COLUMN plyo_type plyo_type,
    ADD COLUMN core_type core_type,
    ADD COLUMN sprint_type sprint_type,
    ADD COLUMN covered_patterns strength_pattern[];
