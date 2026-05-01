import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type EquipmentItem = { id: string; slug: string; name_i18n: Record<string, string> | null };

const EQUIPMENT_LABELS: Record<string, string> = {
    barbell: 'Langhantel',
    dumbbell: 'Kurzhantel',
    kettlebell: 'Kettlebell',
    weight_belt: 'Gewichtsgürtel',
    squat_rack: 'Squat Rack',
    bench: 'Flachbank',
    incline_bench: 'Schrägbank',
    pull_up_bar: 'Klimmzugstange',
    dip_bar: 'Dip Station',
    cable_machine: 'Kabelzug',
    plyo_box: 'Plyo Box',
    medicine_ball: 'Medizinball',
    agility_cones: 'Hütchen',
    resistance_band: 'Widerstandsband',
    foam_roller: 'Schaumstoffrolle',
    sled: 'Schlitten',
    agility_ladder: 'Koordinationsleiter',
};

export function EquipmentStep() {
    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const setStore = useOnboardingStore((s) => s.set);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const storedEquipmentIds = useOnboardingStore((s) => s.equipmentIds);
    const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
    const [deselected, setDeselected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('environment_equipments')
                .select('equipment:equipments(id, slug, name_i18n)')
                .in('environment_id', environmentIds);

            if (data) {
                const map = new Map<string, EquipmentItem>();
                data.forEach((row: any) => {
                    const eq = row.equipment;
                    if (eq && !map.has(eq.id)) {
                        map.set(eq.id, {
                            id: eq.id,
                            slug: eq.slug,
                            name_i18n: eq.name_i18n as Record<string, string> | null,
                        });
                    }
                });
                const items = Array.from(map.values());
                setEquipments(items);
                if (storedEquipmentIds.length > 0) {
                    const storedSet = new Set(storedEquipmentIds);
                    const initialDeselected = new Set(items.filter((e) => !storedSet.has(e.id)).map((e) => e.id));
                    setDeselected(initialDeselected);
                } else {
                    setStore({ equipmentIds: items.map((e) => e.id) });
                }
            }
            setLoading(false);
        }
        if (environmentIds.length > 0) load();
        else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggle(id: string) {
        setDeselected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            const active = equipments.filter((e) => !next.has(e.id)).map((e) => e.id);
            setStore({ equipmentIds: active });
            return next;
        });
    }

    function getLabel(eq: EquipmentItem) {
        return eq.name_i18n?.[locale] ?? EQUIPMENT_LABELS[eq.slug] ?? eq.slug;
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={theme.textMuted} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.equipment_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.equipment_subtitle')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <View style={styles.chipGrid}>
                    {equipments.map((eq) => (
                        <SelectableChip
                            key={eq.id}
                            label={getLabel(eq)}
                            selected={!deselected.has(eq.id)}
                            onPress={() => toggle(eq.id)}
                        />
                    ))}
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1 },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
