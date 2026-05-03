-- ─────────────────────────────────────────────────────────────
-- Add description_i18n (EN + DE) to the 13 mobility assessments
-- seeded in 20260503110000_seed_mobility_assessments.sql
-- ─────────────────────────────────────────────────────────────

UPDATE assessments AS a
SET description_i18n = v.translations
FROM (VALUES
    ('deep_squat_hold', jsonb_build_object(
        'en', 'Stand with feet shoulder-width apart and squat as deep as possible. Hold for 5 seconds. Rate how deep and upright you can sit — 1 means you can barely get low, 10 means full depth with an upright torso and no discomfort.',
        'de', 'Stehe schulterbreit und gehe so tief wie möglich in die Hocke. Halte 5 Sekunden. Bewerte, wie tief und aufrecht du sitzen kannst – 1 bedeutet kaum Tiefe, 10 bedeutet volle Tiefe mit aufrechtem Oberkörper und ohne Beschwerden.'
    )),
    ('pigeon_pose', jsonb_build_object(
        'en', 'From all-fours, bring one knee forward behind your wrist and extend the other leg back. Lower your hips toward the floor and hold for 30 seconds per side. Rate how far your hip sinks — 1 means barely any depth, 10 means hip fully grounded.',
        'de', 'Aus dem Vierfüßlerstand ein Knie nach vorne hinter das Handgelenk bringen und das andere Bein nach hinten strecken. Hüfte Richtung Boden absenken und 30 Sekunden pro Seite halten. Bewerte wie weit deine Hüfte absinkt – 1 = kaum Tiefe, 10 = Hüfte vollständig am Boden.'
    )),
    ('hip_90_90_switch', jsonb_build_object(
        'en', 'Sit on the floor with both knees bent at 90°, one in front and one to the side. Without using your hands, switch sides 5 times by rotating through the hips. Rate the ease and control — 1 means you need your hands and feel very stiff, 10 means smooth and pain-free.',
        'de', 'Sitze auf dem Boden mit beiden Knien im 90°-Winkel, eines vor dir, eines zur Seite. Wechsle ohne Zuhilfenahme der Hände 5-mal die Seite, indem du durch die Hüften rotierst. Bewerte Leichtigkeit und Kontrolle – 1 = du brauchst die Hände und fühlst dich sehr steif, 10 = flüssig und schmerzfrei.'
    )),
    ('couch_stretch', jsonb_build_object(
        'en', 'Kneel with one shin against a wall, the other foot on the ground in a lunge position. Hold for 60 seconds per side. Rate how open your hip flexor and quad feel — 1 means strong pulling tension and limited range, 10 means deep stretch with full hip extension.',
        'de', 'Kniele mit einem Unterschenkel an der Wand, das andere Bein im Ausfallschritt. 60 Sekunden pro Seite halten. Bewerte, wie offen sich Hüftbeuger und Oberschenkel anfühlen – 1 = starkes Ziehen und kaum Bewegungsumfang, 10 = tiefer Stretch mit vollständiger Hüftstreckung.'
    )),
    ('thomas_test', jsonb_build_object(
        'en', 'Lie on the edge of a table or bench. Pull one knee to your chest and hold it, letting the other leg hang freely. Rate how flat the hanging leg lies — 1 means the leg stays high above horizontal, 10 means it hangs fully flat or below the table edge.',
        'de', 'Lege dich auf die Kante eines Tisches oder einer Bank. Ziehe ein Knie zur Brust und halte es fest, das andere Bein hängt frei. Bewerte, wie flach das hängende Bein liegt – 1 = Bein bleibt weit oberhalb der Horizontalen, 10 = hängt vollständig flach oder unterhalb der Tischkante.'
    )),
    ('standing_toe_touch', jsonb_build_object(
        'en', 'Stand tall with feet together and legs straight. Slowly bend forward and reach as far down as possible without bending your knees. Rate how far you reach — 1 means only reaching mid-shin, 10 means palms flat on the floor.',
        'de', 'Stehe aufrecht mit zusammengestellten Füßen und geraden Beinen. Beuge dich langsam nach vorne und greife so weit wie möglich nach unten, ohne die Knie zu beugen. Bewerte deine Reichweite – 1 = nur bis Schienbeinmitte, 10 = Handflächen flach auf dem Boden.'
    )),
    ('seated_forward_fold', jsonb_build_object(
        'en', 'Sit on the floor with both legs straight and together. Reach forward toward your feet as far as possible. Hold for 3 seconds. Rate your range — 1 means you can barely reach past your knees, 10 means you can grip your feet or touch your shins with your forehead.',
        'de', 'Sitze auf dem Boden mit beiden Beinen gestreckt und zusammen. Greife so weit wie möglich nach vorne zu den Füßen. 3 Sekunden halten. Bewerte deinen Bewegungsumfang – 1 = kaum über die Knie hinaus, 10 = Füße greifen oder Stirn berührt die Schienbeine.'
    )),
    ('thoracic_rotation', jsonb_build_object(
        'en', 'Sit cross-legged or on a chair with your hips locked. Place your hands on your shoulders and rotate your upper body as far as possible to each side. Rate the combined range — 1 means very little rotation, 10 means smooth and full rotation to both sides.',
        'de', 'Sitze im Schneidersitz oder auf einem Stuhl mit fixierten Hüften. Hände auf die Schultern legen und den Oberkörper so weit wie möglich zu beiden Seiten drehen. Bewerte den Gesamtumfang – 1 = sehr wenig Rotation, 10 = flüssige und volle Rotation zu beiden Seiten.'
    )),
    ('cat_cow_range', jsonb_build_object(
        'en', 'Start on all-fours with a neutral spine. Slowly arch your back upward (cat) and then drop your belly and lift your head (cow). Perform 5 slow cycles. Rate the full range and smoothness of your spinal movement — 1 means very stiff with little range, 10 means fluid movement through the full spine.',
        'de', 'Starte im Vierfüßlerstand mit neutraler Wirbelsäule. Wölbe den Rücken langsam nach oben (Katze), dann Bauch absenken und Kopf heben (Kuh). 5 langsame Wiederholungen. Bewerte Bewegungsumfang und Flüssigkeit – 1 = sehr steif mit wenig Bewegung, 10 = flüssige Bewegung durch die gesamte Wirbelsäule.'
    )),
    ('thread_the_needle', jsonb_build_object(
        'en', 'Start on all-fours. Slide one arm under your body along the floor, rotating through your thoracic spine. Hold for 5 seconds per side. Rate the rotation depth — 1 means barely any rotation and the shoulder stays high, 10 means shoulder touches the floor comfortably on both sides.',
        'de', 'Starte im Vierfüßlerstand. Schiebe einen Arm unter dem Körper entlang des Bodens und rotiere durch die Brustwirbelsäule. 5 Sekunden pro Seite halten. Bewerte die Rotationstiefe – 1 = kaum Rotation, Schulter bleibt oben, 10 = Schulter berührt bequem den Boden auf beiden Seiten.'
    )),
    ('behind_back_clasp', jsonb_build_object(
        'en', 'Reach one arm overhead and bend the elbow to place the hand behind your upper back. Reach the other arm behind your lower back. Try to clasp your fingers. Test both sides. Rate the combined result — 1 means a large gap on both sides, 10 means fingers clasp easily on both sides.',
        'de', 'Einen Arm über den Kopf heben und den Ellenbogen beugen, sodass die Hand hinter den oberen Rücken kommt. Den anderen Arm hinter dem unteren Rücken nach oben führen. Versuche, die Finger zu verhaken. Beide Seiten testen. Bewerte das Gesamtergebnis – 1 = großer Abstand auf beiden Seiten, 10 = Finger verhaken sich leicht auf beiden Seiten.'
    )),
    ('wall_slide', jsonb_build_object(
        'en', 'Stand with your back, head, and elbows against the wall. Raise your arms overhead while keeping all contact points on the wall. Rate the ease and full range — 1 means you lose contact early and feel strong restriction, 10 means arms slide smoothly all the way overhead without losing any contact.',
        'de', 'Stehe mit Rücken, Kopf und Ellenbogen an der Wand. Führe die Arme an der Wand entlang über den Kopf und behalte alle Kontaktpunkte. Bewerte Leichtigkeit und Bewegungsumfang – 1 = früher Kontaktverlust und starke Einschränkung, 10 = Arme gleiten reibungslos über den Kopf ohne Kontaktverlust.'
    )),
    ('ankle_dorsiflexion', jsonb_build_object(
        'en', 'Place your foot 10 cm from a wall. Keep your heel on the ground and try to touch your knee to the wall. If you can, move the foot further back until you find your limit. Test both sides. Rate the combined ease — 1 means heel lifts immediately or knee cannot reach the wall at 10 cm, 10 means you can achieve 15+ cm on both sides comfortably.',
        'de', 'Stelle deinen Fuß 10 cm von einer Wand entfernt ab. Halte die Ferse auf dem Boden und versuche, das Knie an die Wand zu bringen. Falls es klappt, den Fuß weiter zurückschieben bis zur eigenen Grenze. Beide Seiten testen. Bewerte das Gesamtergebnis – 1 = Ferse hebt sofort ab oder Knie erreicht die Wand bei 10 cm nicht, 10 = 15+ cm auf beiden Seiten problemlos möglich.'
    ))
) AS v(slug, translations)
WHERE a.slug = v.slug;
