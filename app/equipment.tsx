import { JempText } from '@/components/jemp-text';
import { SelectableRow } from '@/components/ui/selectable-row';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Pressable, ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

const ENV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gym: 'barbell-outline',
    outdoor: 'leaf-outline',
    home: 'home-outline',
};

const WEEK_DAYS: { dow: number; key: string }[] = [
    { dow: 1, key: 'onboarding.workout_prefs_day_mon' },
    { dow: 2, key: 'onboarding.workout_prefs_day_tue' },
    { dow: 3, key: 'onboarding.workout_prefs_day_wed' },
    { dow: 4, key: 'onboarding.workout_prefs_day_thu' },
    { dow: 5, key: 'onboarding.workout_prefs_day_fri' },
    { dow: 6, key: 'onboarding.workout_prefs_day_sat' },
    { dow: 7, key: 'onboarding.workout_prefs_day_sun' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'environment' | 'equipment' | 'day_env';
type EnvItem = { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null };
type EquipmentItem = { id: string; slug: string; name_i18n: Record<string, string> | null };

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipmentScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const { profile } = useCurrentUser();
    const userId = profile!.id;

    const [phase, setPhase] = useState<Phase>('environment');
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());
    const [dayEnvMap, setDayEnvMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const preferredDays: number[] = (profile?.preferred_workout_days ?? []).slice().sort((a, b) => a - b);

    useFocusEffect(useCallback(() => {
        setPhase('environment');
        setLoading(true);

        Promise.all([
            supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', userId),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
            supabase.from('user_environments').select('environment_id').eq('user_id', userId),
        ]).then(([envsRes, userEquipRes, envEqRes, userEnvsRes]) => {
            const currentEquipmentIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));
            setSelectedEquipmentIds(currentEquipmentIds);

            const byEnv = new Map<string, EquipmentItem[]>();
            for (const row of envEqRes.data ?? []) {
                const eq = (row.equipment as any);
                if (!eq) continue;
                if (!byEnv.has(row.environment_id)) byEnv.set(row.environment_id, []);
                byEnv.get(row.environment_id)!.push({ id: eq.id, slug: eq.slug, name_i18n: eq.name_i18n as Record<string, string> | null });
            }
            setEquipmentByEnv(byEnv);

            if (envsRes.data) {
                const envItems: EnvItem[] = envsRes.data.map(e => ({
                    id: e.id,
                    slug: e.slug,
                    icon: ENV_ICONS[e.slug] ?? 'location-outline',
                    name_i18n: e.name_i18n as Record<string, string> | null,
                    description_i18n: e.description_i18n as Record<string, string> | null,
                }));
                setAllEnvs(envItems);
                setSelectedEnvIds(new Set((userEnvsRes.data ?? []).map(r => r.environment_id)));
            }

            // Pre-fill day environments from profile
            const savedDayEnvs = (profile as any).day_environments as { day_of_week: number; environment_id: string }[] | null;
            if (savedDayEnvs?.length) {
                const map: Record<number, string> = {};
                savedDayEnvs.forEach(de => { map[de.day_of_week] = de.environment_id; });
                setDayEnvMap(map);
            }

            setLoading(false);
        });
    }, [userId]));

    function toggleEnv(id: string) {
        setSelectedEnvIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            // Clean up dayEnvMap entries for deselected env
            if (next.has(id) === false) {
                setDayEnvMap(m => {
                    const cleaned: Record<number, string> = {};
                    Object.entries(m).forEach(([day, envId]) => {
                        if (envId !== id) cleaned[Number(day)] = envId;
                    });
                    return cleaned;
                });
            }
            return next;
        });
    }

    function toggleEquipment(id: string) {
        setSelectedEquipmentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function goToEquipment() {
        const map = new Map<string, EquipmentItem>();
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (!map.has(eq.id)) map.set(eq.id, eq);
            }
        }
        setAllEquipment([...map.values()].sort((a, b) => a.slug.localeCompare(b.slug)));
        setPhase('equipment');
    }

    function handleNext() {
        if (phase === 'environment') {
            goToEquipment();
        } else if (phase === 'equipment') {
            if (selectedEnvIds.size > 1 && preferredDays.length > 0) {
                setPhase('day_env');
            } else {
                save();
            }
        } else {
            save();
        }
    }

    function goBack() {
        if (phase === 'day_env') setPhase('equipment');
        else if (phase === 'equipment') setPhase('environment');
        else router.back();
    }

    async function save() {
        setSaving(true);
        await Promise.all([
            supabase.from('user_environments').delete().eq('user_id', userId),
            supabase.from('user_equipments').delete().eq('user_id', userId),
        ]);
        const inserts: PromiseLike<any>[] = [];
        if (selectedEnvIds.size > 0) {
            inserts.push(supabase.from('user_environments').insert(
                [...selectedEnvIds].map(environment_id => ({ user_id: userId, environment_id }))
            ));
        }
        if (selectedEquipmentIds.size > 0) {
            inserts.push(supabase.from('user_equipments').insert(
                [...selectedEquipmentIds].map(equipment_id => ({ user_id: userId, equipment_id }))
            ));
        }
        await Promise.all(inserts);

        // Save equipment-environment mapping
        await (supabase as any).from('user_equipment_environments').delete().eq('user_id', userId);
        const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (selectedEquipmentIds.has(eq.id)) {
                    equipEnvRows.push({ user_id: userId, equipment_id: eq.id, environment_id: envId });
                }
            }
        }
        if (equipEnvRows.length > 0) {
            await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
        }

        // Save per-day environments to user_profiles
        const dayEnvironments = Object.entries(dayEnvMap).map(([day, environment_id]) => ({
            day_of_week: Number(day),
            environment_id,
        }));
        await supabase.from('user_profiles').update({
            day_environments: dayEnvironments.length > 0 ? dayEnvironments as any : null,
        }).eq('id', userId);

        trackerManager.track('equipment_changed', {
            environment_count: selectedEnvIds.size,
            equipment_count: selectedEquipmentIds.size,
        });
        setSaving(false);
        router.back();
    }

    const PHASES: Phase[] = selectedEnvIds.size > 1 && preferredDays.length > 0
        ? ['environment', 'equipment', 'day_env']
        : ['environment', 'equipment'];

    const canProceed = phase === 'environment' ? selectedEnvIds.size > 0 : true;

    const selectedEnvList = allEnvs.filter(e => selectedEnvIds.has(e.id));

    return (
        <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable onPress={goBack} hitSlop={12} style={styles.headerSide}>
                    <Ionicons
                        name={phase === 'environment' ? 'close' : 'chevron-back'}
                        size={24}
                        color={theme.text}
                    />
                </Pressable>
                <View style={styles.headerCenter}>
                    <JempText type="body-l" color={theme.textMuted}>
                        {t('ui.available_equipment')}
                    </JempText>
                    <View style={styles.stepBars}>
                        {PHASES.map((p, i) => (
                            <View
                                key={p}
                                style={[
                                    styles.stepBar,
                                    { backgroundColor: i <= PHASES.indexOf(phase) ? GradientMid : theme.borderStrong },
                                ]}
                            />
                        ))}
                    </View>
                </View>
                <View style={styles.headerSide} />
            </View>

            {/* ── Content ── */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={GradientMid} />
                </View>
            ) : phase === 'environment' ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.title}>{t('plan.environment_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.environment_subtitle')}
                    </JempText>
                    <View style={styles.envList}>
                        {allEnvs.map(env => (
                            <SelectableRow
                                key={env.id}
                                label={env.name_i18n?.[locale] ?? env.slug}
                                description={env.description_i18n?.[locale]}
                                icon={env.icon}
                                selected={selectedEnvIds.has(env.id)}
                                onPress={() => toggleEnv(env.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            ) : phase === 'equipment' ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.title}>{t('plan.equipment_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.equipment_subtitle')}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {allEquipment.map(eq => (
                            <SelectableChip
                                key={eq.id}
                                label={eq.name_i18n?.[locale] ?? eq.slug}
                                selected={selectedEquipmentIds.has(eq.id)}
                                onPress={() => toggleEquipment(eq.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.title}>{t('onboarding.workout_prefs_env_label')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('onboarding.workout_prefs_env_hint')}
                    </JempText>
                    {preferredDays.map(dow => {
                        const dayKey = WEEK_DAYS.find(d => d.dow === dow)?.key;
                        return (
                            <View key={dow} style={styles.dayEnvRow}>
                                <JempText type="body-l" style={styles.dayEnvLabel}>
                                    {dayKey ? t(dayKey as any) : ''}
                                </JempText>
                                <View style={styles.dayEnvChips}>
                                    {selectedEnvList.map(env => (
                                        <SelectableChip
                                            key={env.id}
                                            label={env.name_i18n?.[locale] ?? env.slug}
                                            selected={dayEnvMap[dow] === env.id}
                                            onPress={() => setDayEnvMap(prev => {
                                                const next = { ...prev };
                                                if (next[dow] === env.id) delete next[dow];
                                                else next[dow] = env.id;
                                                return next;
                                            })}
                                            style={styles.dayEnvChip}
                                        />
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* ── Fixed bottom button ── */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                <Pressable
                    onPress={handleNext}
                    disabled={!canProceed || saving}
                    style={styles.bottomBtn}
                >
                    <LinearGradient
                        colors={canProceed ? GRADIENT : [theme.surface, theme.surface]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bottomBtnGradient}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <JempText type="button" color={canProceed ? '#fff' : theme.textMuted}>
                                {phase === 'equipment' && !(selectedEnvIds.size > 1 && preferredDays.length > 0)
                                    ? t('ui.save')
                                    : phase === 'day_env'
                                        ? t('ui.save')
                                        : t('ui.continue')}
                            </JempText>
                        )}
                    </LinearGradient>
                </Pressable>
            </View>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },
    stepBars: { flexDirection: 'row', gap: 5 },
    stepBar: { width: 24, height: 3, borderRadius: 2 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    title: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    envList: { gap: 12 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    dayEnvRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dayEnvLabel: { width: 28 },
    dayEnvChips: { flexDirection: 'row', gap: 8, flex: 1 },
    dayEnvChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
