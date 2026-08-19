import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const storedEquipmentIds = useOnboardingStore((s) => s.equipmentIds);
    const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
    const [deselected, setDeselected] = useState<Set<string>>(new Set());
    // Ohne Environments gibt es nichts zu laden — direkt fertig starten
    const [loading, setLoading] = useState(environmentIds.length > 0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Side-Effects außerhalb des Updaters — React verbietet setState-Aufrufe
    // fremder Komponenten innerhalb der Updater-Funktion
    function toggle(id: string) {
        const next = new Set(deselected);
        next.has(id) ? next.delete(id) : next.add(id);
        setDeselected(next);
        const active = equipments.filter((e) => !next.has(e.id)).map((e) => e.id);
        setStore({ equipmentIds: active });
    }

    function getLabel(eq: EquipmentItem) {
        return eq.name_i18n?.[locale] ?? EQUIPMENT_LABELS[eq.slug] ?? eq.slug;
    }

    return (
        <StepScaffold title={t('onboarding.equipment_title')} subtitle={t('onboarding.equipment_subtitle')}>
            {loading ? (
                <View style={styles.chipGrid}>
                    {SKELETON_CHIP_WIDTHS.map((width, i) => (
                        <Skeleton key={i} width={width} height={38} borderRadius={100} />
                    ))}
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.duration(400)}>
                        <View style={styles.chipGrid}>
                            {[...equipments].sort((a, b) => getLabel(a).localeCompare(getLabel(b), locale)).map((eq) => (
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
            )}
        </StepScaffold>
    );
}

// Variierende Breiten, damit das Skeleton wie eine echte Chip-Wolke wirkt
const SKELETON_CHIP_WIDTHS = [96, 120, 84, 132, 104, 90, 116, 100, 88, 124, 96, 110];

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
