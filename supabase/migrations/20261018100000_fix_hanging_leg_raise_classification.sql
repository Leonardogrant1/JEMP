-- QA-Fix 18.10. (30-min-Budget-Simulation): hanging_leg_raise war als
-- Kraft-Übung mit body_region 'quad' ohne core_type getaggt — der Coarse-
-- Fallback (quad→squat) spülte sie dadurch als Knee-dominant-Übung in
-- Kraft-Blöcke ("Front Squat + Hanging Leg Raise" im lower_strength).
-- Fachlich ist das dynamische Core-Flexion wie reverse_crunch/v_up:
-- core / power / sagittal. Idempotent.

UPDATE exercises
SET body_region = 'core', core_type = 'power', movement_type = 'sagittal'
WHERE slug = 'hanging_leg_raise'
  AND core_type IS NULL;
