import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'jemp:cardio-equipment-prompt-v1';
const NEW_EQUIPMENT_SLUGS = ['treadmill', 'stationary_bike', 'air_bike', 'rowing_erg', 'heavy_bag'];

/** Einmal-Hinweis auf die neuen Cardio-Geräte (Conditioning-Formate 10.10.):
 *  Bestandsuser haben sie nie angehakt und bekämen sonst nie eine
 *  Maschinen-/Sack-Session. Zero-Equipment-User sind ungefiltert — kein Prompt.
 *  Persistiert via AsyncStorage: einmalig heißt einmalig, auch bei „Später". */
export function useNewEquipmentPrompt(userId: string | undefined) {
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        async function check() {
            if (await AsyncStorage.getItem(STORAGE_KEY)) return;
            const [{ data: available }, { data: owned }] = await Promise.all([
                supabase.from('equipments').select('slug').in('slug', NEW_EQUIPMENT_SLUGS),
                // FK-Hint nötig: user_equipments → equipments ist über zwei Beziehungen erreichbar
                supabase.from('user_equipments').select('equipments!user_equipments_equipment_id_fkey(slug)').eq('user_id', userId!),
            ]);
            if (cancelled) return;
            const ownedSlugs = (owned ?? []).map((r: any) => r.equipments?.slug).filter(Boolean);
            // Gate: erst wenn die Migration live ist (sonst promptet Prod ins Leere)
            const migrated = (available ?? []).length === NEW_EQUIPMENT_SLUGS.length;
            if (!migrated || ownedSlugs.length === 0) return;
            if (ownedSlugs.some((s: string) => NEW_EQUIPMENT_SLUGS.includes(s))) return;

            await AsyncStorage.setItem(STORAGE_KEY, '1');
            Alert.alert(
                t('ui.new_equipment_title'),
                t('ui.new_equipment_message'),
                [
                    { text: t('ui.new_equipment_later'), style: 'cancel' },
                    { text: t('ui.new_equipment_cta'), onPress: () => router.push('/equipment') },
                ],
            );
        }

        check();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}
