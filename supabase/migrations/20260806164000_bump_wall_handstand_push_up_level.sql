-- Wall Handstand Push-up war auf min_level 55 — zu niedrig für eine der
-- schwersten Push-Bodyweight-Übungen (fast volles Körpergewicht vertikal +
-- Balance). Auf 80 angehoben; wandgestützt, daher nicht die vollen 90+.
update exercises
set min_level = 80
where slug = 'wall_handstand_push_up';
