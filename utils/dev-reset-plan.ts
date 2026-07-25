import { supabase } from '@/services/supabase/client';

// Date logic mirrors externals/jemp-temporal-worker/src/activities/save-plan.ts —
// keep both in sync when the scheduling window changes.

function computePlanDates() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const jsDow = today.getUTCDay();
    const todayDow = jsDow === 0 ? 7 : jsDow;
    const currentMonday = new Date(today);
    currentMonday.setUTCDate(today.getUTCDate() - (todayDow - 1));
    const nextMonday = new Date(currentMonday);
    nextMonday.setUTCDate(currentMonday.getUTCDate() + 7);
    const endDate = new Date(nextMonday);
    endDate.setUTCDate(nextMonday.getUTCDate() + 27);
    return { today, todayDow, currentMonday, nextMonday, endDate };
}

function getScheduledDates(sessionDow: number, todayDow: number, currentMonday: Date, nextMonday: Date): Date[] {
    const dates: Date[] = [];
    if (sessionDow >= todayDow) {
        const d = new Date(currentMonday);
        d.setUTCDate(currentMonday.getUTCDate() + sessionDow - 1);
        dates.push(d);
    }
    for (let week = 0; week < 4; week++) {
        const d = new Date(nextMonday);
        d.setUTCDate(nextMonday.getUTCDate() + week * 7 + sessionDow - 1);
        dates.push(d);
    }
    return dates;
}

/**
 * DEV only: wipes all dated workout_sessions of the active plan (cascades to
 * blocks, exercises and session-linked metric entries) and re-expands the
 * untouched plan templates into fresh scheduled sessions for the next 4 weeks
 * starting today. No AI regeneration involved.
 */
export async function devResetPlan(userId: string): Promise<{ sessionsCreated: number }> {
    const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();
    if (planError) throw new Error(`Failed to load plan: ${planError.message}`);
    if (!plan) throw new Error('No active plan to reset');

    const { error: deleteError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('workout_plan_id', plan.id);
    if (deleteError) throw new Error(`Failed to delete sessions: ${deleteError.message}`);

    const { today, todayDow, currentMonday, nextMonday, endDate } = computePlanDates();

    const { error: planUpdateError } = await supabase
        .from('workout_plans')
        .update({
            start_date: today.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
        })
        .eq('id', plan.id);
    if (planUpdateError) throw new Error(`Failed to update plan dates: ${planUpdateError.message}`);

    const { data: planSessions, error: planSessionsError } = await supabase
        .from('workout_plan_sessions')
        .select(`
            id, day_of_week, name, description, session_type, estimated_duration_minutes,
            pause_between_sets, environment_id,
            workout_plan_session_blocks(
                id, order_index, block_type_id, focused_category_id,
                workout_plan_session_block_exercises(
                    id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max,
                    target_duration_seconds, target_distance_meters, target_rest_seconds,
                    target_load_type, target_load_value
                )
            )
        `)
        .eq('plan_id', plan.id);
    if (planSessionsError) throw new Error(`Failed to load plan sessions: ${planSessionsError.message}`);
    if (!planSessions || planSessions.length === 0) return { sessionsCreated: 0 };

    const workoutSessionsToInsert = planSessions.flatMap(planSession =>
        getScheduledDates(planSession.day_of_week, todayDow, currentMonday, nextMonday).map(date => ({
            user_id: userId,
            workout_plan_id: plan.id,
            workout_plan_session_id: planSession.id,
            name: planSession.name,
            description: planSession.description,
            session_type: planSession.session_type,
            scheduled_at: date.toISOString(),
            status: 'scheduled' as const,
            estimated_duration_minutes: planSession.estimated_duration_minutes,
            pause_between_sets: planSession.pause_between_sets ?? 90,
            environment_id: planSession.environment_id,
        }))
    );

    const { data: insertedSessions, error: sessionsInsertError } = await supabase
        .from('workout_sessions')
        .insert(workoutSessionsToInsert)
        .select('id, workout_plan_session_id');
    if (sessionsInsertError || !insertedSessions) {
        throw new Error(`Failed to insert sessions: ${sessionsInsertError?.message}`);
    }

    const blocksByPlanSessionId = new Map(planSessions.map(ps => [ps.id, ps.workout_plan_session_blocks]));

    const wsBlocksToInsert = insertedSessions.flatMap(ws =>
        (blocksByPlanSessionId.get(ws.workout_plan_session_id!) ?? []).map(planBlock => ({
            workout_session_id: ws.id,
            workout_plan_session_block_id: planBlock.id,
            order_index: planBlock.order_index,
            block_type_id: planBlock.block_type_id,
            focused_category_id: planBlock.focused_category_id,
        }))
    );

    const { data: insertedBlocks, error: blocksInsertError } = await supabase
        .from('workout_session_blocks')
        .insert(wsBlocksToInsert)
        .select('id, workout_plan_session_block_id');
    if (blocksInsertError || !insertedBlocks) {
        throw new Error(`Failed to insert session blocks: ${blocksInsertError?.message}`);
    }

    const exercisesByPlanBlockId = new Map(
        planSessions.flatMap(ps => ps.workout_plan_session_blocks.map(b => [b.id, b.workout_plan_session_block_exercises] as const))
    );

    const wsExercisesToInsert = insertedBlocks.flatMap(wsBlock =>
        (exercisesByPlanBlockId.get(wsBlock.workout_plan_session_block_id!) ?? []).map(planEx => ({
            workout_session_block_id: wsBlock.id,
            workout_plan_session_block_id: wsBlock.workout_plan_session_block_id,
            workout_plan_session_block_exercise_id: planEx.id,
            exercise_id: planEx.exercise_id,
            order_index: planEx.order_index,
            target_sets: planEx.target_sets,
            target_reps_min: planEx.target_reps_min,
            target_reps_max: planEx.target_reps_max,
            target_duration_seconds: planEx.target_duration_seconds,
            target_distance_meters: planEx.target_distance_meters,
            target_rest_seconds: planEx.target_rest_seconds,
            target_load_type: planEx.target_load_type,
            target_load_value: planEx.target_load_value,
        }))
    );

    if (wsExercisesToInsert.length > 0) {
        const { error: exercisesInsertError } = await supabase
            .from('workout_session_block_exercises')
            .insert(wsExercisesToInsert);
        if (exercisesInsertError) {
            throw new Error(`Failed to insert session exercises: ${exercisesInsertError.message}`);
        }
    }

    return { sessionsCreated: insertedSessions.length };
}
