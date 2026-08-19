-- Eindeutig mono-pattern Strength-Übungen waren als full_body getaggt und damit
-- für die Kraftmuster-Logik der Plan-Generierung unsichtbar (full_body mappt auf
-- kein Muster). Echte Hybride (thruster, cleans/snatches, farmers_walk, IMTP)
-- bleiben bewusst full_body.

update exercises set body_region = 'upper_back' where slug = 'banded_face_pull';
update exercises set body_region = 'shoulder'   where slug = 'banded_lateral_raise';
update exercises set body_region = 'shoulder'   where slug = 'banded_overhead_press';
update exercises set body_region = 'glute'      where slug = 'donkey_kick';
update exercises set body_region = 'shoulder'   where slug = 'dumbbell_curl_to_press';
update exercises set body_region = 'chest'      where slug = 'dumbbell_floor_press';
update exercises set body_region = 'glute'      where slug = 'dumbbell_swing';
update exercises set body_region = 'chest'      where slug = 'incline_dumbbell_press';
update exercises set body_region = 'glute'      where slug = 'lateral_band_walk';
update exercises set body_region = 'shoulder'   where slug = 'push_press';
update exercises set body_region = 'hamstring'  where slug = 'trap_bar_deadlift';
update exercises set body_region = 'quad'       where slug = 'wall_sit';
