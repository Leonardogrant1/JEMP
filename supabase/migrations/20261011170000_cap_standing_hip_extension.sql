-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- standing_hip_extension deckeln (QA 11.10.): der beim Activation-Rundumschlag
-- (20261011150000) ausgelassene Rutscher wurde prompt zum Dauer-Pick (3×/Woche
-- bei leo2, Level 80). Int 3, Bodyweight — ab Level 50 übernehmen Kabel-Hüfte
-- und Copenhagen. Idempotent.

begin;
set local lock_timeout = '5s';

update exercises set max_level = 50
where slug = 'standing_hip_extension' and max_level > 50;

commit;
