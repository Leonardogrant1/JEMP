import { supabase } from '@/services/supabase/client';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

// Geräte, die eine Zusatzlast ermöglichen — ein Gym-Profil ohne jedes davon
// ist praktisch sicher ein Datenfehler (Onboarding-Bug: Environment-Wechsel
// deselektierte alle Geräte des neuen Environments) und führt zu
// Bodyweight-only-Plänen im Gym ("nicht intensiv genug"-Beschwerden).
const LOADABLE_EQUIPMENT_SLUGS = new Set(['barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'trap_bar']);

// Einmal pro App-Laufzeit — kein Nag-Screen, aber solange die Daten kaputt
// sind, kommt der Hinweis beim nächsten Start wieder
let promptedThisLaunch = false;

/**
 * Erkennt kaputte Equipment-Profile (gym-Environment + Equipment vorhanden,
 * aber kein einziges Load-Gerät) und bietet einmal pro App-Start die
 * Korrektur über den Equipment-Editor an. User mit komplett leerem Equipment
 * werden bewusst NICHT geprompted — bei denen ist der Equipment-Filter im
 * Generator inaktiv, ihre Pläne sind vollwertig.
 */
export function useEquipmentSanityCheck(userId: string | undefined) {
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!userId || promptedThisLaunch) return;
        let cancelled = false;

        async function check() {
            const [envsRes, equipRes] = await Promise.all([
                supabase.from('user_environments').select('environments(slug)').eq('user_id', userId!),
                // FK-Hint nötig: user_equipments → equipments ist über zwei
                // Beziehungen erreichbar (direkt + via user_equipment_environments)
                supabase.from('user_equipments').select('equipments!user_equipments_equipment_id_fkey(slug)').eq('user_id', userId!),
            ]);
            if (cancelled || promptedThisLaunch) return;

            const envSlugs = (envsRes.data ?? []).map((r: any) => r.environments?.slug).filter(Boolean);
            const equipSlugs = (equipRes.data ?? []).map((r: any) => r.equipments?.slug).filter(Boolean);

            const brokenGymProfile = envSlugs.includes('gym')
                && equipSlugs.length > 0
                && !equipSlugs.some((s: string) => LOADABLE_EQUIPMENT_SLUGS.has(s));
            if (!brokenGymProfile) return;

            promptedThisLaunch = true;
            Alert.alert(
                t('ui.equipment_check_title'),
                t('ui.equipment_check_message'),
                [
                    { text: t('ui.equipment_check_later'), style: 'cancel' },
                    { text: t('ui.equipment_check_cta'), onPress: () => router.push('/equipment') },
                ],
            );
        }

        check();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}
