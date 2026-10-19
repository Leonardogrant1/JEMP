import { supabase } from '@/services/supabase/client';

export type SwapAlternative = {
  exercise: { id: string; slug: string; name: string; thumbnail_storage_path: string | null; equipment: string[] }
  prescription: { target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_duration_seconds: number | null; target_distance_meters: number | null; target_rest_seconds: number | null; target_load_type: string | null; target_load_value: number | null; is_amrap: boolean; target_rounds: number | null }
}

export type SwapAlternativesResponse = {
  alternatives: SwapAlternative[]
  locked: { exercise: SwapAlternative['exercise']; unlock_level: number }[]
  future_occurrence_count: number
}

export async function fetchSwapAlternatives(blockExerciseId: string): Promise<SwapAlternativesResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/swap-alternatives/${blockExerciseId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return res.json();
}
