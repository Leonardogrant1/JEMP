import { supabase } from '@/services/supabase/client';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';

// Startet die Backend-Plan-Generierung auf Basis der bereits gespeicherten
// Profil-Einstellungen und abonniert den Job-Status für den Live-Fortschritt
export async function startPlanGeneration() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');

    usePlanGenerationStore.getState().subscribe(session.user.id);

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/plan-generation/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
}
