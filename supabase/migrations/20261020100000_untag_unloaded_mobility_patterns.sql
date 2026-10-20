-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv-harmlos — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Taxonomie-Fix (QA 20.10., leo2-Befund): Die UNGELADENEN Mobility-Drills
-- cossack_squat und atg_split_squat trugen strength_pattern='knee_dominant'
-- und wurden damit vollwertige Kraft-Pool-Bürger — bei dünnen Fenstern
-- (Level-Gates) gewannen sie den Kraftslot ("cossack_squat 3×5-8 als
-- Knee-Komplement", 5. Sichtung über die Testwochen). Die LOADED-Varianten
-- (loaded_cossack_squat, loaded_atg_split_squat) behalten ihr Pattern-Tag
-- bewusst: beladen sind sie eine echte Kraft-Option (Int 5, Equipment,
-- legacy primary/secondary). Warmup-/Mobility-Nutzung der ungeladenen
-- Drills bleibt unberührt (läuft über Kategorie + Warmup-Tag, und der
-- Coarse-Fallback greift nur für category strength).
begin;
set local lock_timeout = '5s';

update exercises set strength_pattern = null, updated_at = now()
where slug in ('cossack_squat', 'atg_split_squat')
  and strength_pattern is not null;

commit;
