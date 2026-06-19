import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type EnvItem = {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
};

type EquipmentItem = {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    /** All environment IDs this equipment is linked to (filtered to user's selected envs) */
    compatibleEnvIds: string[];
};

export function EquipmentEnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const equipmentIds = useOnboardingStore((s) => s.equipmentIds);
    const storedMappings = useOnboardingStore((s) => s.equipmentEnvironments);
    const setStore = useOnboardingStore((s) => s.set);

    const [environments, setEnvironments] = useState<Map<string, EnvItem>>(new Map());
    // Only equipment that is compatible with 2+ of the user's selected environments
    const [ambiguousEquipment, setAmbiguousEquipment] = useState<EquipmentItem[]>([]);
    // selected: equipmentId → Set<environmentId>
    const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setCanContinue(true); // optional step
    }, []);

    useEffect(() => {
        async function load() {
            const [envsRes, envEqRes] = await Promise.all([
                supabase
                    .from('environments')
                    .select('id, slug, name_i18n')
                    .in('id', environmentIds),
                supabase
                    .from('environment_equipments')
                    .select('environment_id, equipment_id')
                    .in('environment_id', environmentIds)
                    .in('equipment_id', equipmentIds),
            ]);

            const envMap = new Map<string, EnvItem>();
            for (const e of envsRes.data ?? []) {
                envMap.set(e.id, {
                    id: e.id,
                    slug: e.slug,
                    name_i18n: e.name_i18n as Record<string, string> | null,
                });
            }
            setEnvironments(envMap);

            // Build: equipmentId → Set<compatibleEnvId> (within user's selected envs)
            const eqToEnvs = new Map<string, Set<string>>();
            for (const row of envEqRes.data ?? []) {
                if (!eqToEnvs.has(row.equipment_id)) eqToEnvs.set(row.equipment_id, new Set());
                eqToEnvs.get(row.equipment_id)!.add(row.environment_id);
            }

            // Only show equipment compatible with 2+ of the user's selected environments
            const ambiguousIds = [...eqToEnvs.entries()]
                .filter(([, envs]) => envs.size > 1)
                .map(([id]) => id);

            if (ambiguousIds.length === 0) {
                // Nothing ambiguous — auto-assign everything and done
                const autoMappings = buildAutoMappings(eqToEnvs);
                setStore({ equipmentEnvironments: autoMappings });
                setLoading(false);
                return;
            }

            const { data: eqData } = await supabase
                .from('equipments')
                .select('id, slug, name_i18n')
                .in('id', ambiguousIds);

            const items: EquipmentItem[] = (eqData ?? []).map(eq => ({
                id: eq.id,
                slug: eq.slug,
                name_i18n: eq.name_i18n as Record<string, string> | null,
                compatibleEnvIds: [...(eqToEnvs.get(eq.id) ?? [])],
            }));
            setAmbiguousEquipment(items);

            // Initialize selections: restore from store, or default to all compatible envs
            const initSelections = new Map<string, Set<string>>();
            const storedByEq = new Map<string, Set<string>>();
            for (const m of storedMappings) {
                if (!storedByEq.has(m.equipment_id)) storedByEq.set(m.equipment_id, new Set());
                storedByEq.get(m.equipment_id)!.add(m.environment_id);
            }
            for (const item of items) {
                initSelections.set(
                    item.id,
                    storedByEq.get(item.id) ?? new Set(item.compatibleEnvIds)
                );
            }
            setSelections(initSelections);

            // Auto-assign unambiguous equipment and merge with user selections on save
            const autoMappings = buildAutoMappings(eqToEnvs, ambiguousIds);
            syncToStore(initSelections, autoMappings);

            setLoading(false);
        }

        if (environmentIds.length > 1 && equipmentIds.length > 0) {
            load();
        } else {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Auto-mappings for equipment with exactly 1 compatible env (no choice needed) */
    function buildAutoMappings(
        eqToEnvs: Map<string, Set<string>>,
        excludeIds: string[] = [],
    ) {
        const result: { equipment_id: string; environment_id: string }[] = [];
        for (const [eqId, envIds] of eqToEnvs) {
            if (excludeIds.includes(eqId)) continue;
            for (const envId of envIds) {
                result.push({ equipment_id: eqId, environment_id: envId });
            }
        }
        return result;
    }

    function syncToStore(
        currentSelections: Map<string, Set<string>>,
        autoMappings: { equipment_id: string; environment_id: string }[],
    ) {
        const userMappings: { equipment_id: string; environment_id: string }[] = [];
        for (const [eqId, envIds] of currentSelections) {
            for (const envId of envIds) {
                userMappings.push({ equipment_id: eqId, environment_id: envId });
            }
        }
        setStore({ equipmentEnvironments: [...autoMappings, ...userMappings] });
    }

    function toggle(equipmentId: string, envId: string) {
        const next = new Map(selections);
        const envSet = new Set(next.get(equipmentId) ?? []);
        envSet.has(envId) ? envSet.delete(envId) : envSet.add(envId);
        next.set(equipmentId, envSet);
        setSelections(next);

        const autoMappings = storedMappings.filter(
            m => !ambiguousEquipment.some(eq => eq.id === m.equipment_id)
        );
        syncToStore(next, autoMappings);
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={theme.textMuted} />
            </View>
        );
    }

    if (ambiguousEquipment.length === 0) return null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>
                    {t('onboarding.equipment_location_title')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.equipment_location_subtitle')}
                </JempText>
            </Animated.View>

            {ambiguousEquipment.map((eq, i) => {
                const eqSelections = selections.get(eq.id) ?? new Set();
                return (
                    <Animated.View
                        key={eq.id}
                        entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()}
                        style={styles.equipmentRow}
                    >
                        <JempText type="body-l" color={theme.text} style={styles.equipmentLabel}>
                            {eq.name_i18n?.[locale] ?? eq.slug}
                        </JempText>
                        <View style={styles.chipGrid}>
                            {eq.compatibleEnvIds.map(envId => {
                                const env = environments.get(envId);
                                if (!env) return null;
                                return (
                                    <SelectableChip
                                        key={envId}
                                        label={env.name_i18n?.[locale] ?? env.slug}
                                        selected={eqSelections.has(envId)}
                                        onPress={() => toggle(eq.id, envId)}
                                    />
                                );
                            })}
                        </View>
                    </Animated.View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1 },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 40,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    equipmentRow: { marginBottom: 24 },
    equipmentLabel: { marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
