-- Fünf equipmentfreie Beginner-Übungen (04.09.): Gap-Analyse nach den
-- Intensitäts-Paket-Testläufen zeigte leere/dünne Pools für Beginner ohne
-- Equipment: keine glute/hip/calf-Sprünge (jumps), zuhause null Primary-fähige
-- Lower-Plyo, kein Upper-Plyo-Einstieg unter Kneeling Plyo Push-up (L10),
-- keine Dip-Variante unter Level 20.
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar;
-- referenziert bewusst NICHT is_unilateral (lokal bereits gedroppt, Prod noch
-- nicht — Spalte hat Default, Insert funktioniert in beiden Zuständen).

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps', v.laterality::laterality, v.description_i18n::jsonb
from (values
  ('Skater Jump', 'skater_jump', 'lower_body_plyometrics', 'glute', 'plyometric', 5, 100, 5, 'alternating',
   '{"de": "Seitlich explosiv von einem Bein aufs andere springen wie ein Eisschnellläufer, weich auf dem Außenbein landen und direkt wieder abdrücken. Seitliche Sprungkraft und Hüftstabilität ohne Equipment.", "en": "Bound explosively sideways from one leg to the other like a speed skater, land softly on the outside leg and push off again immediately. Lateral power and hip stability with no equipment."}'),
  ('Side-to-Side Hops', 'side_to_side_hops', 'jumps', 'calf', 'plyometric', 1, 50, 4, 'bilateral',
   '{"de": "Beidbeinig schnell über eine Linie hin- und herspringen, steifes Sprunggelenk, minimale Bodenkontaktzeit. Reaktiver Einstieg in seitliche Sprungarbeit für Waden und Sprunggelenke.", "en": "Hop quickly side to side over a line with both feet, stiff ankles and minimal ground contact time. A reactive entry into lateral jump work for calves and ankles."}'),
  ('Reverse Lunge to Knee Drive', 'reverse_lunge_knee_drive', 'jumps', 'glute', 'plyometric', 5, 70, 5, 'alternating',
   '{"de": "Aus dem Ausfallschritt rückwärts das hintere Knie explosiv nach oben ziehen und dabei leicht abspringen, kontrolliert landen und die Seite wechseln. Explosive Hüftstreckung mit kniefreundlichem Einstieg.", "en": "From a reverse lunge, drive the back knee up explosively with a small hop, land under control and switch sides. Explosive hip extension with a knee-friendly entry point."}'),
  ('Wall Plyo Push-up', 'wall_plyo_push_up', 'upper_body_plyometrics', 'chest', 'plyometric', 1, 35, 3, 'bilateral',
   '{"de": "Im Stand gegen die Wand lehnen, explosiv abdrücken bis die Hände die Wand verlassen und weich wieder abfangen. Der einfachste Einstieg in explosive Druckarbeit für den Oberkörper.", "en": "Lean against a wall, push off explosively until your hands leave the wall and catch yourself softly. The easiest entry into explosive upper-body pushing."}'),
  ('Chair Dip', 'chair_dip', 'strength', 'tricep', 'push', 1, 45, 4, 'bilateral',
   '{"de": "Hände hinter dem Körper auf einer stabilen Kante (Stuhl, Bank), Ellbogen beugen und den Körper kontrolliert absenken, dann kraftvoll hochdrücken. Trizeps- und Schulterkraft ohne Geräte.", "en": "Hands on a sturdy edge behind you (chair, bench), bend the elbows to lower your body under control, then press back up. Triceps and shoulder strength without equipment."}')
) as v(name, slug, category_slug, body_region, movement_pattern, min_level, max_level, intensity_score, laterality, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Block-Tags: Sprünge/Plyos primary+secondary; Side-to-Side Hops zusätzlich
-- warmup; Chair Dip bewusst nur secondary+accessory (kein Hauptreiz)
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on (
     (e.slug in ('skater_jump', 'reverse_lunge_knee_drive', 'wall_plyo_push_up') and bt.slug in ('primary', 'secondary'))
  or (e.slug = 'side_to_side_hops' and bt.slug in ('primary', 'secondary', 'warmup'))
  or (e.slug = 'chair_dip' and bt.slug in ('secondary', 'accessory'))
)
where e.slug in ('skater_jump', 'side_to_side_hops', 'reverse_lunge_knee_drive', 'wall_plyo_push_up', 'chair_dip')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- kein Equipment (Chair Dip nutzt Alltagsgegenstände); Environments: überall
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('skater_jump', 'side_to_side_hops', 'reverse_lunge_knee_drive', 'wall_plyo_push_up', 'chair_dip')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
