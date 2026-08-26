-- Drei reaktive Bodyweight-Sprungübungen für die jumps-Kategorie (26.08.):
-- Jump Lunges fehlten komplett im Katalog; Single-Leg-Pogos existierten nur mit
-- Agility-Leiter; Tuck Jump fehlte als Klassiker. Zuordnung nach der geschärften
-- Regel "Sprung-Ausdrucksform → jumps" (Familien-Konsistenz mit pogos,
-- jump_squat, lateral_bounds). Equipment-frei, alle Environments — füllt
-- nebenbei reaktive Hallenarbeit für User ohne Geräte.
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, 'plyometric', v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps', v.laterality::laterality, false, v.description_i18n::jsonb
from (values
  ('Alternating Jump Lunge', 'alternating_jump_lunge', 'quad', 15, 100, 7, 'alternating',
   '{"de": "Aus dem Ausfallschritt explosiv abspringen und die Beine in der Luft wechseln, weich landen und direkt wieder abdrücken. Unilaterale Sprungkraft und Reaktivität ohne Equipment.", "en": "Jump explosively out of the lunge, switch legs mid-air, land softly and push off again immediately. Unilateral jumping power and reactivity with no equipment."}'),
  ('Single-Leg Pogo Hop', 'single_leg_pogo_hop', 'calf', 25, 100, 6, 'unilateral',
   '{"de": "Einbeinige, schnelle Sprungfedern mit steifem Sprunggelenk und minimaler Bodenkontaktzeit. Baut reaktive Steifigkeit für Absprung und Sprint auf.", "en": "Fast single-leg pogo hops with a stiff ankle and minimal ground contact time. Builds the reactive stiffness behind take-offs and sprinting."}'),
  ('Tuck Jump', 'tuck_jump', 'quad', 25, 100, 7, 'bilateral',
   '{"de": "Maximal hoch abspringen und die Knie explosiv zur Brust ziehen, weich landen und sofort wieder abspringen. Explosive Hüft- und Kniestreckung mit reaktiver Komponente.", "en": "Jump as high as possible, driving the knees to the chest, land softly and take off again immediately. Explosive hip and knee extension with a reactive component."}')
) as v(name, slug, body_region, min_level, max_level, intensity_score, laterality, description_i18n)
join categories c on c.slug = 'jumps'
where not exists (select 1 from exercises e where e.slug = v.slug);

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug in ('alternating_jump_lunge', 'single_leg_pogo_hop', 'tuck_jump')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- kein Equipment; Environments: überall (explizite Zeilen wie beim Bestand)
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('alternating_jump_lunge', 'single_leg_pogo_hop', 'tuck_jump')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
