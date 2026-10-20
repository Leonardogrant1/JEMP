-- Prod-DDL safety (spec §6.1): fail fast instead of queueing behind a lock.
SET LOCAL lock_timeout = '5s';

-- New block types for the session structure redesign (spec §1.2).
-- primary/secondary stay for existing sessions; new plans use these.
-- Only the generator assigns block types, so adding rows is invisible
-- to old clients (safe pre-release).
ALTER TABLE block_types ADD CONSTRAINT block_types_slug_key UNIQUE (slug);

INSERT INTO block_types (slug) VALUES
    ('push'),
    ('pull'),
    ('lower_body'),
    ('rotation'),
    ('core'),
    ('plyo'),
    ('sprint'),
    ('cod'),
    ('conditioning'),
    ('mobility')
ON CONFLICT (slug) DO NOTHING;
