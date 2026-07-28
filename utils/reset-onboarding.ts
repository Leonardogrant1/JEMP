import { supabase } from '@/services/supabase/client';

/**
 * Clears the onboarding-relevant profile fields so the user runs
 * through onboarding again. Store reset and profile refresh stay
 * with the caller (they need React context).
 */
export async function resetOnboardingProfile(userId: string): Promise<void> {
    const { error } = await supabase
        .from('user_profiles')
        .update({
            has_onboarded: false,
            first_name: null,
            last_name: null,
            birth_date: null,
            gender: null,
            sport_id: null,
            height_in_cm: null,
            weight_in_kg: null,
            preferred_workout_days: [],
            preferred_session_duration: null,
            timezone: null,
        })
        .eq('id', userId);
    if (error) throw new Error(error.message);
}
