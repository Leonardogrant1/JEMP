-- Fehlende Indizes auf den Session-Tabellen (Query-Audit 03.11.2026):
-- workout_sessions hatte außer dem PK keinen einzigen Index — der Plan-Screen
-- (Filter workout_plan_id, 19k Calls à Ø 2,3s) und alle user-scoped Zugriffe
-- (RLS user_id) liefen als Seq-Scan über ~129k Zeilen. performed_sets hatte
-- keinen Index auf workout_session_id (Session-weite Set-Abfragen).

create index workout_sessions_workout_plan_id_idx
    on public.workout_sessions (workout_plan_id);

create index workout_sessions_user_id_idx
    on public.workout_sessions (user_id);

create index workout_session_performed_sets_session_id_idx
    on public.workout_session_performed_sets (workout_session_id);
