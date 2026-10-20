-- QA-Fix 15.10.: Equipment-Links der Pull-up-Familie waren verdreht.
-- Der Filter matcht Equipment per ODER (eine der Optionen reicht):
--   pull_up hatte weight_belt|pull_up_bar  → Gürtel allein hätte gereicht
--   weighted_pull_up hatte nur pull_up_bar → Stange ohne jedes Zusatzgewicht
--     reichte, darum bekamen Home-User ohne Gewichte den Weighted Pull-up.
-- Neu: pull_up braucht die Stange; weighted_pull_up braucht den Dip-Gürtel
-- (ODER kann "Stange UND Gewicht" nicht ausdrücken — der Gürtel impliziert
-- den Klimmzug-Kontext, niemand besitzt einen ohne Stange). Idempotent.

DELETE FROM exercise_equipments l
USING exercises e, equipments q
WHERE e.id = l.exercise_id AND q.id = l.equipment_id
  AND e.slug = 'pull_up' AND q.slug = 'weight_belt';

DELETE FROM exercise_equipments l
USING exercises e, equipments q
WHERE e.id = l.exercise_id AND q.id = l.equipment_id
  AND e.slug = 'weighted_pull_up' AND q.slug = 'pull_up_bar';

INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT e.id, q.id FROM exercises e, equipments q
WHERE e.slug = 'weighted_pull_up' AND q.slug = 'weight_belt'
  AND NOT EXISTS (
    SELECT 1 FROM exercise_equipments l
    WHERE l.exercise_id = e.id AND l.equipment_id = q.id
  );
