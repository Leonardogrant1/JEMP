-- ─────────────────────────────────────────────────────────────
-- workout_plans: Sichtbarkeitsdaten für Verletzungs-Constraints (Task 7).
-- injury_adjusted: Pool wurde durch aktive Constraints tatsächlich verengt
-- (Exclusions schneiden exerciseRows). injury_conflicts: Prio-3-Säulen, deren
-- Pool nach Exclusions leer oder stark reduziert ist ({ pillar, reason }[]).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE workout_plans
  ADD COLUMN injury_adjusted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN injury_conflicts JSONB;
