// Eigenes Modul OHNE Supabase-Import, damit der Select-String jest-testbar ist
// (Regression-Pin: Intervall-/Distanz-Felder dürfen nie wieder aus der
// Selektion fallen — Phase-4-Review Critical 1).
export const SESSION_DETAIL_SELECT = `
    id, name, description, session_type, scheduled_at, status, estimated_duration_minutes, pause_between_sets, rest_adjust_seconds, current_exercise_index, current_set_number, workout_plan_session_id,
    workout_session_blocks (
        id, order_index,
        block_type:block_types ( slug ),
        focused_category:categories ( slug ),
        workout_session_block_exercises (
            id, order_index,
            target_sets, target_reps_min, target_reps_max,
            target_duration_seconds, target_rest_seconds,
            target_distance_meters, target_rounds,
            target_load_type, target_load_value, is_amrap,
            exercise:exercises ( id, name, slug, image_group, body_region, movement_pattern, thumbnail_storage_path, video_storage_path, youtube_url, laterality, measurement_type, category:categories ( slug ) )
        )
    )
` as const;
