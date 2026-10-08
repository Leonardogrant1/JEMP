import { UserProfile } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';

// Prüft, ob alle für die Plan-Generierung nötigen Einstellungen vorliegen
// (Trainingstage, Dauer, Ziele, Umgebungen, Säulen-Stufen) — fehlt etwas,
// muss der User durch den Wizard statt direkt zu generieren
export async function hasCompletePlanSettings(profile: UserProfile): Promise<boolean> {
    if ((profile.preferred_workout_days?.length ?? 0) < 2) return false;
    if (!profile.preferred_session_duration) return false;

    const [goals, envs, pillars] = await Promise.all([
        supabase.from('user_targeted_categories').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
        supabase.from('user_environments').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
        // §6.5: ohne wizard-gesetzte Säulen bliebe der User auf v1 — Bestands-
        // user werden so beim ersten Generieren einmalig in den Wizard geroutet
        supabase.from('user_pillar_levels').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('set_by_wizard', true),
    ]);
    return (goals.count ?? 0) > 0 && (envs.count ?? 0) > 0 && (pillars.count ?? 0) > 0;
}
