-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Fehlende environment_equipments (QA 10.10., offener Punkt aus dem
-- Exercise-Drift-Thema): landmine und plate hatten NULL Environment-Links —
-- der Equipment-Picker lädt über environment_equipments, beide waren damit
-- für niemanden anhakbar. Folge: Landmine-Übungen (u. a. landmine_punch_throw,
-- landmine_switch_punch) konnten in keinem Pool landen.
-- landmine → gym (braucht Langhantel + Anker, wie barbell gym-only);
-- plate → gym + home (Scheiben gibt es auch im Home-Setup, z. B. Seated Calf Raise).

begin;
set local lock_timeout = '5s';

insert into environment_equipments (environment_id, equipment_id)
select env.id, eq.id
from equipments eq
join environments env on (
  (eq.slug = 'landmine' and env.slug = 'gym')
  or (eq.slug = 'plate' and env.slug in ('gym', 'home'))
)
where not exists (
  select 1 from environment_equipments ee
  where ee.environment_id = env.id and ee.equipment_id = eq.id
);

commit;
