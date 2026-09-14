-- Adduktoren-Katalog (12.09.): Unterbau für die Sport-Pflicht-Region `groin`.
-- (a) copenhagen_hip_adduction war als hip getaggt und damit für die
--     groin-Abdeckung unsichtbar. (b) Unter Level 15 gab es KEINEN einzigen
--     Adduktoren-Kräftiger (copenhagen_plank/loaded_cossack ab 30, cossack ab
--     15) — zwei equipment-freie Einstiegsvarianten ergänzen.
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

update exercises set body_region = 'groin'
where slug = 'copenhagen_hip_adduction' and body_region <> 'groin';

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', v.measurement_type, v.laterality::laterality, v.description_i18n::jsonb
from (values
  ('Side-Lying Hip Adduction', 'side_lying_hip_adduction', 'strength', 'groin', 'legs', 1, 40, 2, 'reps', 'unilateral',
   '{"de": "In Seitenlage das untere Bein gestreckt gegen die Schwerkraft anheben, oben kurz halten und kontrolliert absenken. Der sanfteste Einstieg in gezieltes Adduktoren-Training — wichtig für Leistengesundheit bei Richtungswechseln.", "en": "Lying on your side, lift the bottom leg straight up against gravity, pause briefly and lower under control. The gentlest entry into direct adductor work — key for groin health in change-of-direction sports."}'),
  ('Short-Lever Copenhagen Plank', 'short_lever_copenhagen_plank', 'strength', 'groin', 'isometric', 10, 55, 4, 'duration', 'unilateral',
   '{"de": "Seitstütz mit dem oberen KNIE auf einer stabilen Kante (Bank, Stuhl, Couch), Hüfte anheben und halten. Die entschärfte Copenhagen-Variante — kürzerer Hebel, gleicher Adduktoren-Reiz, deutlich einstiegsfreundlicher.", "en": "Side plank with the top KNEE on a sturdy edge (bench, chair, couch), lift the hips and hold. The regressed Copenhagen variation — shorter lever, same adductor stimulus, far more beginner-friendly."}')
) as v(name, slug, category_slug, body_region, movement_pattern, min_level, max_level, intensity_score, measurement_type, laterality, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Reine Accessory-Rolle (Prävention/Ergänzung, kein Hauptreiz)
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'accessory'
where e.slug in ('side_lying_hip_adduction', 'short_lever_copenhagen_plank')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Kein Equipment (Alltagskante reicht, Konvention wie chair_dip); überall machbar
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('side_lying_hip_adduction', 'short_lever_copenhagen_plank')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
