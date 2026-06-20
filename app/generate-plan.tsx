import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { HeightSlider, WeightSlider } from '@/components/ui/measurement-slider';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { SelectableRow } from '@/components/ui/selectable-row';
import { getCategoryLabel, type CategoryI18n } from '@/constants/category-labels';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { Enums } from '@/database.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeLoadProfile } from '@/lib/load-profile';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { WeeklyScheduleSession } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Pressable, ScrollView, StyleSheet,
    TouchableOpacity, View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionDuration = Enums<'session_duration'>;
type Phase = 'sport' | 'environment' | 'equipment' | 'equipment-env' | 'goals' | 'body' | 'schedule' | 'weekly';
type GoalsSubPhase = 'select' | 'rank';

interface EnvItem { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null }
interface EquipmentItem { id: string; slug: string; name_i18n: Record<string, string> | null }
interface AmbiguousItem { id: string; slug: string; name_i18n: Record<string, string> | null; compatibleEnvIds: string[] }
interface CategoryItem { id: string; slug: string; label: string; name_i18n: CategoryI18n }

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];
const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'equipment-env', 'goals', 'body', 'schedule', 'weekly'];

const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);

function getSessionTypes(sportSlug: string | null | undefined): { key: WeeklyScheduleSession['type']; labelKey: string }[] {
    const isCombat = COMBAT_SPORTS.has(sportSlug ?? '');
    return [
        { key: 'team_training', labelKey: 'onboarding.weekly_schedule_type_training' },
        { key: 'game', labelKey: isCombat ? 'onboarding.weekly_schedule_type_fight' : 'onboarding.weekly_schedule_type_game' },
        { key: 'tournament', labelKey: 'onboarding.weekly_schedule_type_tournament' },
    ];
}

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

const WEEK_DAYS: { dow: number; key: string }[] = [
    { dow: 1, key: 'onboarding.workout_prefs_day_mon' },
    { dow: 2, key: 'onboarding.workout_prefs_day_tue' },
    { dow: 3, key: 'onboarding.workout_prefs_day_wed' },
    { dow: 4, key: 'onboarding.workout_prefs_day_thu' },
    { dow: 5, key: 'onboarding.workout_prefs_day_fri' },
    { dow: 6, key: 'onboarding.workout_prefs_day_sat' },
    { dow: 7, key: 'onboarding.workout_prefs_day_sun' },
];

const ENV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gym: 'barbell-outline',
    outdoor: 'leaf-outline',
    home: 'home-outline',
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBars({ phase }: { phase: Phase }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const idx = PHASES.indexOf(phase);

    return (
        <View style={styles.stepBars}>
            {PHASES.map((_, i) =>
                i <= idx ? (
                    <View key={i} style={[styles.stepBar, { backgroundColor: GradientMid }]} />
                ) : (
                    <View key={i} style={[styles.stepBar, { backgroundColor: theme.borderStrong }]} />
                )
            )}
        </View>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GeneratePlanScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const { profile } = useCurrentUser();

    const [phase, setPhase] = useState<Phase>('sport');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Sport
    const [selectedSportSlug, setSelectedSportSlug] = useState<string | null>(null);

    // Environment
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());

    // Equipment
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

    // Equipment-environment mapping
    const [ambiguousEquipment, setAmbiguousEquipment] = useState<AmbiguousItem[]>([]);
    const [equipmentEnvSelections, setEquipmentEnvSelections] = useState<Map<string, Set<string>>>(new Map());
    const [savedEquipmentEnvMappings, setSavedEquipmentEnvMappings] = useState<{ equipment_id: string; environment_id: string }[]>([]);

    // Goals
    const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [rankedCategories, setRankedCategories] = useState<CategoryItem[]>([]);
    const [goalsSubPhase, setGoalsSubPhase] = useState<GoalsSubPhase>('select');

    // Body
    const [weightKg, setWeightKg] = useState(75);
    const [heightCm, setHeightCm] = useState(175);
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

    // Schedule
    const [preferredDays, setPreferredDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]));
    const [preferredDuration, setPreferredDuration] = useState<SessionDuration | null>(null);
    const [scheduleNotes, setScheduleNotes] = useState('');
    const [dayEnvMap, setDayEnvMap] = useState<Record<number, string>>({});

    // Weekly sport schedule
    const [sportSessions, setSportSessions] = useState<WeeklyScheduleSession[]>([]);

    // Pre-fill on mount
    useEffect(() => {
        if (!profile) return;

        setPhase('sport');
        setLoading(true);

        // Pre-fill body data
        if (profile.weight_in_kg) setWeightKg(profile.weight_in_kg);
        if (profile.height_in_cm) setHeightCm(profile.height_in_cm);
        // Pre-fill sport
        setSelectedSportSlug(profile.sport?.slug ?? null);
        // Pre-fill preferred days
        if (profile.preferred_workout_days?.length) {
            setPreferredDays(new Set(profile.preferred_workout_days));
        }
        setPreferredDuration(profile.preferred_session_duration ?? null);
        setScheduleNotes(profile.schedule_notes ?? '');
        setSportSessions((profile as any).weekly_schedule?.sessions ?? []);
        const savedDayEnvs = (profile as any).day_environments as { day_of_week: number; environment_id: string }[] | null;
        if (savedDayEnvs?.length) {
            const map: Record<number, string> = {};
            savedDayEnvs.forEach(de => { map[de.day_of_week] = de.environment_id; });
            setDayEnvMap(map);
        }

        Promise.all([
            supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', profile.id),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
            supabase.from('categories').select('id, slug, name_i18n'),
            supabase.from('user_targeted_categories').select('category_id, priority').eq('user_id', profile.id).order('priority'),
            supabase.from('user_environments').select('environment_id').eq('user_id', profile.id),
            (supabase as any).from('user_equipment_environments').select('equipment_id, environment_id').eq('user_id', profile.id),
        ]).then(async ([envsRes, userEquipRes, envEqRes, catsRes, targetedRes, userEnvsRes, userEqEnvRes]) => {
            // Categories
            const catItems: CategoryItem[] = (catsRes.data ?? []).map(c => ({
                id: c.id,
                slug: c.slug,
                name_i18n: c.name_i18n as CategoryI18n,
                label: getCategoryLabel(c.slug, t, c.name_i18n as CategoryI18n),
            }));
            setAllCategories(catItems);
            if (targetedRes.data?.length) {
                const ids = new Set(targetedRes.data.map(r => r.category_id));
                setSelectedCategoryIds(ids);
                const ordered = targetedRes.data
                    .sort((a, b) => a.priority - b.priority)
                    .map(r => catItems.find(c => c.id === r.category_id)!)
                    .filter(Boolean);
                setRankedCategories(ordered);
            } else {
                setSelectedCategoryIds(new Set());
                setRankedCategories([]);
            }
            setGoalsSubPhase('select');
            const currentIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));
            setSelectedEquipmentIds(currentIds);

            // Build envId → EquipmentItem[] map
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

                // Pre-select saved user environments; fall back to inferring from equipment
                const savedEnvIds = (userEnvsRes.data ?? []).map(r => r.environment_id);
                if (savedEnvIds.length > 0) {
                    setSelectedEnvIds(new Set(savedEnvIds));
                } else if (currentIds.size > 0) {
                    const { data: envEqRows } = await supabase
                        .from('environment_equipments')
                        .select('environment_id')
                        .in('equipment_id', [...currentIds]);
                    if (envEqRows) {
                        setSelectedEnvIds(new Set(envEqRows.map(r => r.environment_id)));
                    }
                } else {
                    setSelectedEnvIds(new Set());
                }
            }
            setSavedEquipmentEnvMappings(userEqEnvRes.data ?? []);
            setLoading(false);
        });
    }, [profile]);

    function toggleEnv(id: string) {
        setSelectedEnvIds(prev => {
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

    function handleEquipmentNext() {
        // Find equipment compatible with 2+ selected environments
        const eqToEnvs = new Map<string, Set<string>>();
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (!selectedEquipmentIds.has(eq.id)) continue;
                if (!eqToEnvs.has(eq.id)) eqToEnvs.set(eq.id, new Set());
                eqToEnvs.get(eq.id)!.add(envId);
            }
        }

        // Build selections: auto-assign unambiguous, collect ambiguous for UI
        const selections = new Map<string, Set<string>>();
        const ambiguous: AmbiguousItem[] = [];

        // Restore saved mappings grouped by equipment
        const savedByEq = new Map<string, Set<string>>();
        for (const m of savedEquipmentEnvMappings) {
            if (!savedByEq.has(m.equipment_id)) savedByEq.set(m.equipment_id, new Set());
            savedByEq.get(m.equipment_id)!.add(m.environment_id);
        }

        for (const [eqId, envIds] of eqToEnvs) {
            if (envIds.size > 1) {
                // Ambiguous: will be shown in UI
                const eqItem = allEquipment.find(e => e.id === eqId);
                if (eqItem) {
                    ambiguous.push({ id: eqId, slug: eqItem.slug, name_i18n: eqItem.name_i18n, compatibleEnvIds: [...envIds] });
                }
                // Restore saved selection or default to all compatible envs
                selections.set(eqId, savedByEq.get(eqId) ?? new Set(envIds));
            } else {
                // Unambiguous: auto-assign
                selections.set(eqId, new Set(envIds));
            }
        }

        setEquipmentEnvSelections(selections);

        if (ambiguous.length === 0) {
            setGoalsSubPhase('select');
            setPhase('goals');
        } else {
            setAmbiguousEquipment(ambiguous);
            setPhase('equipment-env');
        }
    }

    function toggleEquipment(id: string) {
        setSelectedEquipmentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleEquipmentEnv(equipmentId: string, envId: string) {
        setEquipmentEnvSelections(prev => {
            const next = new Map(prev);
            const envSet = new Set(next.get(equipmentId) ?? []);
            envSet.has(envId) ? envSet.delete(envId) : envSet.add(envId);
            next.set(equipmentId, envSet);
            return next;
        });
    }

    function toggleSportDay(day: number) {
        const exists = sportSessions.find(s => s.day_of_week === day);
        if (exists) {
            setSportSessions(prev => prev.filter(s => s.day_of_week !== day));
        } else {
            setSportSessions(prev => [...prev, { day_of_week: day, type: 'team_training', intensity: 6 }]);
        }
    }

    function setSportType(day: number, type: WeeklyScheduleSession['type']) {
        setSportSessions(prev => prev.map(s => s.day_of_week === day ? { ...s, type } : s));
    }

    function setSportIntensity(day: number, intensity: number) {
        setSportSessions(prev => prev.map(s => s.day_of_week === day ? { ...s, intensity } : s));
    }

    function goBack() {
        if (phase === 'environment') setPhase('sport');
        else if (phase === 'equipment') setPhase('environment');
        else if (phase === 'equipment-env') setPhase('equipment');
        else if (phase === 'goals') {
            if (goalsSubPhase === 'rank') setGoalsSubPhase('select');
            else setPhase('equipment');
        }
        else if (phase === 'body') {
            if (selectedCategoryIds.size <= 1) {
                setGoalsSubPhase('select');
            }
            setPhase('goals');
        }
        else if (phase === 'schedule') setPhase('body');
        else if (phase === 'weekly') setPhase('schedule');
        else router.back();
    }

    async function generate() {
        if (!profile || isSaving) return;
        setIsSaving(true);
        setSaveError(null);
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.user?.id) {
            usePlanGenerationStore.getState().subscribe(authSession.user.id);
        }
        try {
            // 1. Update sport if changed
            if (selectedSportSlug && selectedSportSlug !== profile.sport?.slug) {
                const { data: sportRow } = await supabase
                    .from('sports').select('id').eq('slug', selectedSportSlug).single();
                if (sportRow) {
                    await supabase.from('user_profiles')
                        .update({ sport_id: sportRow.id })
                        .eq('id', profile.id);
                }
            }

            // 2. Update weight / height (always in kg/cm)
            await supabase.from('user_profiles').update({
                ...(weightKg > 0 && { weight_in_kg: weightKg }),
                ...(heightCm > 0 && { height_in_cm: heightCm }),
            }).eq('id', profile.id);

            // 3. Update environments
            await supabase.from('user_environments').delete().eq('user_id', profile.id);
            if (selectedEnvIds.size > 0) {
                await supabase.from('user_environments').insert(
                    [...selectedEnvIds].map(environment_id => ({ user_id: profile.id, environment_id }))
                );
            }

            // 4. Update equipment
            await supabase.from('user_equipments').delete().eq('user_id', profile.id);
            if (selectedEquipmentIds.size > 0) {
                await supabase.from('user_equipments').insert(
                    [...selectedEquipmentIds].map(equipment_id => ({ user_id: profile.id, equipment_id }))
                );
            }

            // 4b. Update equipment-environment mapping (which equipment is in which environment)
            await (supabase as any).from('user_equipment_environments').delete().eq('user_id', profile.id);
            const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
            for (const envId of selectedEnvIds) {
                for (const eq of equipmentByEnv.get(envId) ?? []) {
                    if (selectedEquipmentIds.has(eq.id)) {
                        equipEnvRows.push({ user_id: profile.id, equipment_id: eq.id, environment_id: envId });
                    }
                }
            }
            if (equipEnvRows.length > 0) {
                await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
            }

            // 5. Update goals (targeted categories with priority)
            await supabase.from('user_targeted_categories').delete().eq('user_id', profile.id);
            if (rankedCategories.length > 0) {
                await supabase.from('user_targeted_categories').insert(
                    rankedCategories.map((cat, i) => ({ user_id: profile.id, category_id: cat.id, priority: i + 1 }))
                );
            }

            // 6. Update preferred workout days, duration, notes + weekly sport schedule
            const { load_score, load_profile } = computeLoadProfile(sportSessions);
            await supabase.from('user_profiles')
                .update({
                    preferred_workout_days: [...preferredDays].sort((a, b) => a - b),
                    preferred_session_duration: preferredDuration,
                    schedule_notes: scheduleNotes.trim() || null,
                    weekly_schedule: { sessions: sportSessions, notes: null } as any,
                    day_environments: Object.entries(dayEnvMap).map(([day, environment_id]) => ({
                        day_of_week: Number(day),
                        environment_id,
                    })) as any,
                    load_score,
                    load_profile,
                })
                .eq('id', profile.id);

            // 7. Generate plan — fire-and-forget; job progress tracked via Realtime store
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/plan-generation/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authSession?.access_token}` },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error ?? `HTTP ${res.status}`);
            }

            router.replace('/(tabs)/plan');
        } catch (err: any) {
            setIsSaving(false);
            setSaveError(err?.message ?? 'Unknown error');
            console.error('generate error:', err?.message);
        }
    }

    const canProceedSport = !!selectedSportSlug;
    const canProceedEnv = selectedEnvIds.size > 0;

    function handleNext() {
        if (phase === 'sport') setPhase('environment');
        else if (phase === 'environment') goToEquipment();
        else if (phase === 'equipment') handleEquipmentNext();
        else if (phase === 'equipment-env') { setGoalsSubPhase('select'); setPhase('goals'); }
        else if (phase === 'goals') {
            if (goalsSubPhase === 'select') {
                const selected = allCategories.filter(c => selectedCategoryIds.has(c.id));
                if (selected.length > 1) {
                    setRankedCategories(selected);
                    setGoalsSubPhase('rank');
                } else {
                    setRankedCategories(selected);
                    setPhase('body');
                }
            } else {
                setPhase('body');
            }
        }
        else if (phase === 'body') setPhase('schedule');
        else if (phase === 'schedule') setPhase('weekly');
    }

    const canProceedNext =
        phase === 'sport' ? canProceedSport :
            phase === 'environment' ? canProceedEnv :
                phase === 'goals' ? selectedCategoryIds.size > 0 :
                    phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
                        true;

    return (
        <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

            {/* Header */}
            <View style={[styles.header]}>
                <Pressable onPress={goBack} hitSlop={12}>
                    <Ionicons
                        name={phase === 'sport' ? 'close' : 'arrow-back'}
                        size={24}
                        color={theme.text}
                    />
                </Pressable>
                <View style={styles.headerCenter}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.new_plan')}</JempText>
                    <StepBars phase={phase} />
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* ── Sport ── */}
            {phase === 'sport' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('ui.sport')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.sport_subtitle')}
                    </JempText>
                    {SPORT_GROUPS.map(group => (
                        <View key={group.titleKey} style={styles.group}>
                            <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                                {t(group.titleKey as any).toUpperCase()}
                            </JempText>
                            <View style={styles.chipGrid}>
                                {group.sports.map(sport => (
                                    <SelectableChip
                                        key={sport.slug}
                                        label={getSportLabelI18n(sport.slug, t) ?? sport.slug}
                                        selected={selectedSportSlug === sport.slug}
                                        onPress={() => setSelectedSportSlug(sport.slug)}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* ── Environment ── */}
            {phase === 'environment' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.environment_title')}</JempText>
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
            )}

            {/* ── Equipment ── */}
            {phase === 'equipment' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.equipment_title')}</JempText>
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
            )}

            {/* ── Goals ── */}
            {phase === 'goals' && goalsSubPhase === 'select' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.select_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('goals.select_subtitle')}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {allCategories.map(cat => (
                            <SelectableChip
                                key={cat.id}
                                label={cat.label}
                                selected={selectedCategoryIds.has(cat.id)}
                                onPress={() => setSelectedCategoryIds(prev => {
                                    const next = new Set(prev);
                                    next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                                    return next;
                                })}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}

            {phase === 'goals' && goalsSubPhase === 'rank' && (
                <DraggableFlatList
                    data={rankedCategories}
                    keyExtractor={item => item.id}
                    onDragEnd={({ data }) => setRankedCategories(data)}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, drag }: RenderItemParams<CategoryItem>) => {
                        const index = rankedCategories.indexOf(item);
                        return (
                            <ScaleDecorator activeScale={1.03}>
                                <TouchableOpacity
                                    onLongPress={drag}
                                    activeOpacity={1}
                                    style={[styles.rankRow, { backgroundColor: theme.surface }]}
                                >
                                    <JempText type="caption" color={theme.textMuted} style={styles.rankNumber}>
                                        {index + 1}
                                    </JempText>
                                    <JempText type="body-l" color={theme.text} style={{ flex: 1 }}>
                                        {item.label}
                                    </JempText>
                                    <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                                </TouchableOpacity>
                            </ScaleDecorator>
                        );
                    }}
                    ListHeaderComponent={
                        <View>
                            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.rank_title')}</JempText>
                            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                                {t('goals.rank_subtitle')}
                            </JempText>
                        </View>
                    }
                />
            )}

            {/* ── Body data ── */}
            {phase === 'body' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.body_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.body_subtitle')}
                    </JempText>
                    <WeightSlider
                        valueKg={weightKg}
                        onChange={setWeightKg}
                        unit={weightUnit}
                        onToggleUnit={() => setWeightUnit(u => u === 'kg' ? 'lbs' : 'kg')}
                    />
                    <HeightSlider
                        valueCm={heightCm}
                        onChange={setHeightCm}
                        unit={heightUnit}
                        onToggleUnit={() => setHeightUnit(u => u === 'cm' ? 'ft' : 'cm')}
                    />
                </ScrollView>
            )}

            {/* ── Schedule ── */}
            {phase === 'schedule' && (
                <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.schedule_subtitle')}
                    </JempText>

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('onboarding.workout_prefs_days_label')}
                        </JempText>
                        <View style={styles.dayChipRow}>
                            {WEEK_DAYS.map(({ dow, key }) => (
                                <SelectableChip
                                    key={dow}
                                    label={t(key as any)}
                                    selected={preferredDays.has(dow)}
                                    onPress={() => setPreferredDays(prev => {
                                        const next = new Set(prev);
                                        if (next.has(dow) && next.size <= 2) return prev;
                        if (next.has(dow)) setDayEnvMap(m => { const n = { ...m }; delete n[dow]; return n; });
                                        next.has(dow) ? next.delete(dow) : next.add(dow);
                                        return next;
                                    })}
                                    style={styles.dayChip}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('plan.schedule_duration_label')}
                        </JempText>
                        <View style={styles.durationRow}>
                            {DURATIONS.map(d => (
                                <SelectableChip
                                    key={d.value}
                                    label={d.label}
                                    selected={preferredDuration === d.value}
                                    onPress={() => setPreferredDuration(d.value)}
                                    style={styles.durationChip}
                                />
                            ))}
                        </View>
                    </View>

                    {selectedEnvIds.size > 1 && preferredDays.size > 0 && (
                        <View style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t('onboarding.workout_prefs_env_label')}
                            </JempText>
                            <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                                {t('onboarding.workout_prefs_env_hint')}
                            </JempText>
                            {[...preferredDays].sort((a, b) => a - b).map(dow => {
                                const dayKey = WEEK_DAYS.find(d => d.dow === dow)?.key;
                                const selectedEnvs = allEnvs.filter(e => selectedEnvIds.has(e.id));
                                return (
                                    <View key={dow} style={styles.dayEnvRow}>
                                        <JempText type="body-l" style={styles.dayEnvLabel}>
                                            {dayKey ? t(dayKey as any) : ''}
                                        </JempText>
                                        <View style={styles.dayEnvChips}>
                                            {selectedEnvs.map(env => (
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
                        </View>
                    )}

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('plan.schedule_notes_label')}
                        </JempText>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                            {t('plan.schedule_notes_hint')}
                        </JempText>
                        <JempInput
                            value={scheduleNotes}
                            onChangeText={setScheduleNotes}
                            placeholder={t('plan.schedule_notes_placeholder')}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={styles.notesInput}
                        />
                    </View>
                </KeyboardAwareScrollView>
            )}

            {/* ── Weekly sport schedule ── */}
            {phase === 'weekly' && (() => {
                const selectedSportDays = new Set(sportSessions.map(s => s.day_of_week));
                const sortedSportSessions = [...sportSessions].sort((a, b) => a.day_of_week - b.day_of_week);
                return (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                            {t('onboarding.weekly_schedule_title')}
                        </JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            {t('onboarding.weekly_schedule_subtitle')}
                        </JempText>

                        <View style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t('onboarding.weekly_schedule_days_label')}
                            </JempText>
                            <View style={styles.dayChipRow}>
                                {WEEK_DAYS.map(({ dow, key }) => (
                                    <SelectableChip
                                        key={dow}
                                        label={t(key as any)}
                                        selected={selectedSportDays.has(dow)}
                                        onPress={() => toggleSportDay(dow)}
                                        style={styles.dayChip}
                                    />
                                ))}
                            </View>
                        </View>

                        {sortedSportSessions.map(session => {
                            const dayLabel = WEEK_DAYS.find(d => d.dow === session.day_of_week);
                            const preferredDaysArray = [...preferredDays];

                            function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same'): number[] {
                                if (mode === 'same') return preferredDaysArray.includes(sportDay) ? [sportDay] : [];
                                const prev = sportDay === 1 ? 7 : sportDay - 1;
                                const next = sportDay === 7 ? 1 : sportDay + 1;
                                return preferredDaysArray.filter(d => d === prev || d === next);
                            }

                            function formatDays(days: number[]): string {
                                return days.map(d => t(WEEK_DAYS.find(x => x.dow === d)?.key as any ?? '')).join(', ');
                            }

                            return (
                                <View key={session.day_of_week} style={[styles.sportCard, { backgroundColor: theme.surface }]}>
                                    <View style={styles.sportCardHeader}>
                                        <JempText type="body-sm" style={{ fontWeight: '600' }}>
                                            {t(dayLabel?.key as any)}
                                        </JempText>
                                        <TouchableOpacity onPress={() => toggleSportDay(session.day_of_week)} hitSlop={12}>
                                            <JempText type="body-sm" color={theme.textMuted}>✕</JempText>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.chipGrid}>
                                        {getSessionTypes(selectedSportSlug).map(st => (
                                            <SelectableChip
                                                key={st.key}
                                                label={t(st.labelKey as any)}
                                                selected={session.type === st.key}
                                                onPress={() => setSportType(session.day_of_week, st.key)}
                                                size="sm"
                                            />
                                        ))}
                                    </View>

                                    {(session.type === 'game' || session.type === 'tournament') && (() => {
                                        const prev = session.day_of_week === 1 ? 7 : session.day_of_week - 1;
                                        const next = session.day_of_week === 7 ? 1 : session.day_of_week + 1;
                                        const affected = preferredDaysArray.filter(d => d === prev || d === next);
                                        if (affected.length === 0) return null;
                                        return (
                                            <View style={styles.hintBox}>
                                                <JempText type="body-sm" color={GradientMid}>
                                                    {t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected) })}
                                                </JempText>
                                            </View>
                                        );
                                    })()}

                                    {session.type !== 'game' && session.type !== 'tournament' && (
                                        <View style={styles.intensityRow}>
                                            <View style={styles.intensityHeader}>
                                                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                                    {t('onboarding.weekly_schedule_intensity_label')}
                                                </JempText>
                                                <JempText type="h2">{session.intensity}</JempText>
                                            </View>
                                            <Slider
                                                style={styles.slider}
                                                minimumValue={1}
                                                maximumValue={10}
                                                step={1}
                                                value={session.intensity}
                                                onValueChange={v => setSportIntensity(session.day_of_week, v)}
                                                minimumTrackTintColor={GradientMid}
                                                maximumTrackTintColor={theme.borderStrong}
                                                thumbTintColor={theme.text}
                                            />
                                            {session.intensity === 7 && (() => {
                                                const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                                if (sameDay.length === 0) return null;
                                                return (
                                                    <View style={styles.hintBox}>
                                                        <JempText type="body-sm" color={GradientMid}>
                                                            {t('onboarding.weekly_schedule_hint_intensity_7', { days: formatDays(sameDay) })}
                                                        </JempText>
                                                    </View>
                                                );
                                            })()}
                                            {session.intensity >= 8 && (() => {
                                                const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                                const adjacent = getAffectedJempDays(session.day_of_week, 'adjacent');
                                                if (sameDay.length === 0 && adjacent.length === 0) return null;
                                                const key = sameDay.length > 0 && adjacent.length > 0
                                                    ? 'onboarding.weekly_schedule_hint_intensity_8plus_both'
                                                    : sameDay.length > 0
                                                        ? 'onboarding.weekly_schedule_hint_intensity_8plus_same'
                                                        : 'onboarding.weekly_schedule_hint_intensity_8plus_adjacent';
                                                return (
                                                    <View style={styles.hintBox}>
                                                        <JempText type="body-sm" color={GradientMid}>
                                                            {t(key, { sameDays: formatDays(sameDay), adjacentDays: formatDays(adjacent) })}
                                                        </JempText>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                );
            })()}

            {/* Fixed bottom button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                {saveError && (
                    <JempText type="body-sm" color="#ef4444" style={{ textAlign: 'center', marginBottom: 8 }}>
                        {saveError}
                    </JempText>
                )}
                <Pressable
                    onPress={phase === 'weekly' ? generate : handleNext}
                    disabled={!canProceedNext || isSaving}
                    style={styles.bottomBtn}
                >
                    <LinearGradient
                        colors={canProceedNext ? GRADIENT : [theme.surface, theme.surface]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bottomBtnGradient}
                    >
                        {isSaving
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color={canProceedNext ? '#fff' : theme.textMuted}>
                                {phase === 'weekly' ? t('plan.create') : t('ui.continue')}
                            </JempText>
                        }
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
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },
    stepBars: { flexDirection: 'row', gap: 5 },
    stepBar: { width: 24, height: 3, borderRadius: 2 },

    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },

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
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Sport / Equipment chips
    group: { marginBottom: 24 },
    groupTitle: { letterSpacing: 1, fontSize: 11, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    // Goals rank
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 10,
    },
    rankNumber: { width: 20, textAlign: 'center' },

    // Environment cards
    envList: { gap: 12 },

    // Schedule
    section: { marginBottom: 32 },
    sectionLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
    dayEnvRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dayEnvLabel: { width: 28 },
    dayEnvChips: { flexDirection: 'row', gap: 8, flex: 1 },
    dayEnvChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },

    // Weekly sport schedule
    sportCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
    sportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    intensityRow: { marginTop: 12 },
    intensityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    slider: { width: '100%', height: 40, marginHorizontal: -8 },
    hintBox: {
        marginTop: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(61, 158, 203, 0.15)',
    },

    closePlanBtn: {
        borderRadius: 100,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
