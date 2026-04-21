import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';

type EquipmentItem = { id: string; slug: string; label: string };

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

    const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
    const [deselected, setDeselected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('environment_equipments')
                .select('equipment:equipments(id, slug)')
                .in('environment_id', environmentIds);

            if (data) {
                const map = new Map<string, EquipmentItem>();
                data.forEach((row: any) => {
                    const eq = row.equipment;
                    if (eq && !map.has(eq.id)) {
                        map.set(eq.id, {
                            id: eq.id,
                            slug: eq.slug,
                            label: EQUIPMENT_LABELS[eq.slug] ?? eq.slug,
                        });
                    }
                });
                const items = Array.from(map.values());
                setEquipments(items);
                setStore({ equipmentIds: items.map((e) => e.id) });
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            const active = equipments.filter((e) => !next.has(e.id)).map((e) => e.id);
            setStore({ equipmentIds: active });
            return next;
        });
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color="white" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Dein Equipment</Text>
            <Text style={styles.subtitle}>Alles vorausgewählt — deaktiviere was du nicht hast.</Text>
            <View style={styles.grid}>
                {equipments.map((eq) => {
                    const active = !deselected.has(eq.id);
                    return (
                        <TouchableOpacity
                            key={eq.id}
                            style={[styles.chip, !active && styles.chipInactive]}
                            onPress={() => toggle(eq.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.chipText, !active && styles.chipTextInactive]}>
                                {eq.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    chipInactive: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'transparent',
    },
    chipText: { color: 'white', fontSize: 14, fontWeight: '500' },
    chipTextInactive: { color: 'rgba(255,255,255,0.3)' },
});
