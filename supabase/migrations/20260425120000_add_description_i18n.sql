-- Add JSONB translation column to exercises and assessments
ALTER TABLE exercises   ADD COLUMN IF NOT EXISTS description_i18n JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS description_i18n JSONB;

-- ─────────────────────────────────────────────────────────────
-- Exercises — populate from existing English description
-- ─────────────────────────────────────────────────────────────
UPDATE exercises
SET description_i18n = jsonb_build_object('en', description)
WHERE description IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Assessments — populate with en + de
-- ─────────────────────────────────────────────────────────────
UPDATE assessments AS a
SET description_i18n = v.translations
FROM (VALUES
    ('back_squat_1rm', jsonb_build_object(
        'en', 'Warm up thoroughly, then work up to your max in 4–5 sets. Start at ~60 % of your estimated max, adding weight each set. Rest 3–5 min between attempts. Depth must reach parallel or below. Record the heaviest rep you complete with good form.',
        'de', 'Wärme dich gründlich auf und arbeite dich in 4–5 Sätzen an dein Maximum heran. Starte bei ca. 60 % deines geschätzten Maximalgewichts. 3–5 Min. Pause zwischen den Versuchen. Tiefe mindestens bis zur Parallele. Notiere das schwerste sauber ausgeführte Gewicht.'
    )),
    ('hip_thrust_1rm', jsonb_build_object(
        'en', 'Set up with your upper back against a bench, bar across your hips with a pad for comfort. Work up in 4–5 sets with 3–5 min rest. Drive through your heels and squeeze glutes at full hip extension. Record the heaviest rep you complete.',
        'de', 'Lehne deinen Oberkörper an eine Bank, die Hantel liegt mit Polster über deinen Hüften. Arbeite dich in 4–5 Sätzen mit 3–5 Min. Pause vor. Drücke durch die Fersen und strecke die Hüfte am oberen Punkt vollständig durch. Notiere das schwerste sauber ausgeführte Gewicht.'
    )),
    ('romanian_deadlift_1rm', jsonb_build_object(
        'en', 'Stand tall holding the bar. Hinge at the hips with a neutral spine and soft knees until the bar reaches mid-shin level. Work up in 4–5 sets with 3–5 min rest. Record the heaviest rep you complete with a neutral back.',
        'de', 'Stehe aufrecht mit der Hantel in den Händen. Kippe aus der Hüfte nach vorne, neutraler Rücken, Knie leicht gebeugt, bis die Stange Höhe Schienbeinmitte erreicht. 4–5 Sätze mit 3–5 Min. Pause. Notiere das schwerste Gewicht mit neutraler Wirbelsäule.'
    )),
    ('bench_press_1rm', jsonb_build_object(
        'en', 'Lie flat on the bench, feet on the floor, grip slightly wider than shoulder-width. Work up in 4–5 sets with 3–5 min rest. Lower the bar until it touches your chest, then press to full lockout. Record the heaviest successful rep.',
        'de', 'Lege dich flach auf die Bank, Füße auf dem Boden, Griff etwas breiter als schulterbreit. 4–5 Sätze mit 3–5 Min. Pause. Stange kontrolliert zur Brust führen, dann vollständig durchdrücken. Notiere das schwerste sauber ausgeführte Gewicht.'
    )),
    ('weighted_pullups_1rm', jsonb_build_object(
        'en', 'Attach extra weight via a belt or weighted vest. Start from a dead hang and pull until your chin clears the bar. Work up in 4–5 sets starting from bodyweight, resting 3–5 min between. Enter the added weight only — your bodyweight is factored in automatically.',
        'de', 'Hänge Zusatzgewicht per Gürtel oder Weste an. Start im toten Hang, ziehe dich hoch bis das Kinn die Stange überkreuzt. Starte mit Körpergewicht und steigere in 4–5 Sätzen mit 3–5 Min. Pause. Gib nur das Zusatzgewicht ein — dein Körpergewicht wird automatisch eingerechnet.'
    )),
    ('max_pushups', jsonb_build_object(
        'en', 'Start in a high plank, hands shoulder-width apart. Lower your chest to the ground, then press to full arm extension. Only count reps with full range of motion. Stop when form breaks down. Record your total.',
        'de', 'Starte in der hohen Plank-Position, Hände schulterbreit. Brust bis zum Boden senken, dann vollständig durchdrücken. Nur Wiederholungen mit vollem Bewegungsumfang zählen. Stoppe, wenn die Technik nachlässt. Notiere deine Gesamtzahl.'
    )),
    ('max_pullups', jsonb_build_object(
        'en', 'Start from a dead hang, palms facing away. Pull until your chin clears the bar, lower under control. No kipping allowed. Only count reps with full range of motion. Stop when your chin no longer clears the bar. Record your total.',
        'de', 'Start im toten Hang, Hände proniert. Ziehe dich hoch bis das Kinn die Stange überkreuzt, dann kontrolliert absenken. Kein Schwingen. Nur saubere Wiederholungen zählen. Stoppe, wenn das Kinn die Stange nicht mehr überquert. Notiere deine Gesamtzahl.'
    )),
    ('max_dips', jsonb_build_object(
        'en', 'Support yourself between the bars with arms extended. Lower until your upper arms are parallel to the ground, then press back to full lockout. No swinging. Record your total clean reps.',
        'de', 'Stütze dich auf den Barren mit gestreckten Armen. Senke dich bis die Oberarme parallel zum Boden sind, dann vollständig zurückdrücken. Kein Schwingen. Notiere deine sauber ausgeführten Gesamtwiederholungen.'
    )),
    ('vertical_jump', jsonb_build_object(
        'en', 'Stand flat-footed next to a wall and mark your standing reach. Jump as high as possible and mark the highest point you touch. Measure the difference between the two marks. Take up to 3 attempts and record your best in cm.',
        'de', 'Stehe aufrecht neben einer Wand und markiere deine Reichweite im Stand. Springe so hoch wie möglich und markiere den höchsten Berührungspunkt. Messe die Differenz. Bis zu 3 Versuche – notiere deinen besten Wert in cm.'
    )),
    ('broad_jump', jsonb_build_object(
        'en', 'Stand behind a line with feet hip-width apart. Swing your arms and jump as far as possible horizontally. Land on both feet. Measure from the line to the back of your heels. Take up to 3 attempts and record your best distance in cm.',
        'de', 'Stehe hinter einer Linie, Füße hüftbreit. Schwinge die Arme und springe so weit wie möglich horizontal. Lande auf beiden Füßen. Messe vom Absprungpunkt bis zur Ferse. Bis zu 3 Versuche – notiere deine beste Weite in cm.'
    )),
    ('box_jump', jsonb_build_object(
        'en', 'Start at a manageable box height. Jump onto the box and land softly with both feet flat. Increase height until you can no longer land safely and with control. Record the highest box height you successfully cleared in cm.',
        'de', 'Starte mit einer machbaren Boxhöhe. Springe auf die Box und lande weich auf beiden Füßen. Erhöhe die Höhe, bis kein sicheres Landen mehr möglich ist. Notiere die höchste Box in cm, auf der du sauber landen konntest.'
    )),
    ('sprint_10m', jsonb_build_object(
        'en', 'Mark a start line and a cone at 10 m. Sprint as fast as possible from a standing start through the finish. Use a stopwatch or timing gates. Take 2–3 attempts with full rest in between. Record your best time in seconds.',
        'de', 'Markiere Start und Ziel bei 10 m. Sprint aus dem Stand so schnell wie möglich durch das Ziel. Stoppuhr oder Lichtschranken verwenden. 2–3 Versuche mit vollständiger Pause dazwischen. Notiere deine beste Zeit in Sekunden.'
    )),
    ('sprint_30m', jsonb_build_object(
        'en', 'Mark a start line and a cone at 30 m. Sprint as fast as possible from a standing start through the finish. Use a stopwatch or timing gates. Take 2 attempts with full rest in between. Record your best time in seconds.',
        'de', 'Markiere Start und Ziel bei 30 m. Sprint aus dem Stand so schnell wie möglich durch das Ziel. Stoppuhr oder Lichtschranken verwenden. 2 Versuche mit vollständiger Pause dazwischen. Notiere deine beste Zeit in Sekunden.'
    )),
    ('sprint_10m_flying', jsonb_build_object(
        'en', 'Set up a 20 m build-up zone followed by a 10 m timed zone. Accelerate through the first 20 m to reach full speed before the timed section starts. Only the final 10 m are timed. Record your best time in seconds.',
        'de', 'Lege eine 20 m Beschleunigungszone fest, gefolgt von 10 m Messzone. Beschleunige durch die ersten 20 m auf Topspeed – die Zeit wird erst ab der Messzone gestoppt. Notiere deine beste Zeit in Sekunden.'
    )),
    ('agility_505', jsonb_build_object(
        'en', 'Place cones at 0 m and 5 m. Sprint from the 0 m cone to the 5 m cone, touch the line, pivot 180° and sprint back through the start. Time from first movement to crossing the start line. Take 2 attempts each side and record your best in seconds.',
        'de', 'Platziere Hütchen bei 0 m und 5 m. Sprint zum 5-m-Hütchen, berühre die Linie, drehe 180° und sprint zurück durch die Startlinie. Zeitmessung ab der ersten Bewegung. 2 Versuche pro Seite – notiere deine beste Zeit in Sekunden.'
    )),
    ('mb_chest_throw', jsonb_build_object(
        'en', 'Hold the medicine ball at chest height, elbows out. Standing still, push the ball explosively away from your chest. Measure from the throw line to where the ball first lands. Take 3 attempts and record your best distance in cm.',
        'de', 'Halte den Medizinball auf Brusthöhe, Ellenbogen nach außen. Stoße den Ball aus dem Stand explosiv von der Brust weg. Messe vom Abwurfpunkt bis zum ersten Aufprall. 3 Versuche – notiere deine beste Weite in cm.'
    )),
    ('mb_rotational_throw', jsonb_build_object(
        'en', 'Stand sideways to the throw direction, feet shoulder-width apart. Rotate and throw the ball explosively using your whole body. Measure from the throw line to the first landing spot. Take 3 attempts each side and record your best in cm.',
        'de', 'Stehe seitlich zur Wurfrichtung, Füße schulterbreit. Rotiere und wirf den Ball explosiv mit dem ganzen Körper. Messe vom Abwurfpunkt bis zum ersten Aufprall. 3 Versuche pro Seite – notiere deine beste Weite in cm.'
    )),
    ('mb_overhead_throw', jsonb_build_object(
        'en', 'Hold the ball overhead with both hands, feet hip-width apart. Swing back slightly and throw forward as far as possible. Measure from the throw line to the first landing spot. Take 3 attempts and record your best distance in cm.',
        'de', 'Halte den Ball mit beiden Händen über dem Kopf, Füße hüftbreit. Leicht zurückschwingen und den Ball so weit wie möglich nach vorne werfen. Messe vom Abwurfpunkt bis zum ersten Aufprall. 3 Versuche – notiere deine beste Weite in cm.'
    )),
    ('clap_pushups', jsonb_build_object(
        'en', 'Start in a high plank. Lower your chest toward the ground, then press up explosively, clapping your hands before landing. Each clap counts as one rep. Stop when you can no longer get airborne. Record your total.',
        'de', 'Starte in der hohen Plank-Position. Senke dich zur Brust, drücke explosiv hoch und klatsche in der Luft in die Hände vor der Landung. Jeder Klatscher zählt als eine Wiederholung. Stoppe, wenn kein Abheben mehr möglich ist. Notiere deine Gesamtzahl.'
    ))
) AS v(slug, translations)
WHERE a.slug = v.slug;
