import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { SelectableRow } from '@/components/ui/selectable-row';
import { GeneratingView } from '@/components/ui/generating-view';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { WeightSlider, HeightSlider } from '@/components/ui/measurement-slider';
import { CATEGORY_LABELS } from '@/constants/category-labels';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { SPORT_GROUPS } from '@/constants/sports';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { UserProfile } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable, ScrollView, StyleSheet,
    TouchableOpacity, View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'sport' | 'environment' | 'equipment' | 'goals' | 'body' | 'schedule' | 'generating';
type GoalsSubPhase = 'select' | 'rank';

interface EnvItem { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null }
interface EquipmentItem { id: string; slug: string; name_i18n: Record<string, string> | null }
interface CategoryItem { id: string; slug: string; label: string }

interface Props {
    visible: boolean;
    profile: UserProfile;
    onClose: () => void;
    onComplete: () => void;
}

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];
const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'goals', 'body', 'schedule'];

const WEEK_DAYS: { dow: number; label: string }[] = [
    { dow: 1, label: 'Montag' },
    { dow: 2, label: 'Dienstag' },
    { dow: 3, label: 'Mittwoch' },
    { dow: 4, label: 'Donnerstag' },
    { dow: 5, label: 'Freitag' },
    { dow: 6, label: 'Samstag' },
    { dow: 7, label: 'Sonntag' },
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

// ─── Main component ───────────────────────────────────────────────────────────

export function GeneratePlanSheet({ visible, profile, onClose, onComplete }: Props) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const [phase, setPhase] = useState<Phase>('sport');
    const [loading, setLoading] = useState(true);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [planReady, setPlanReady] = useState(false);

    // Sport
    const [selectedSportSlug, setSelectedSportSlug] = useState<string | null>(null);

    // Environment
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());

    // Equipment
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

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
    const [scheduleNotes, setScheduleNotes] = useState('');

    // Pre-fill on open
    useEffect(() => {
        if (!visible) return;
        setPhase('sport');
        setGenerateError(null);
        setPlanReady(false);
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
        setScheduleNotes(profile.schedule_notes ?? '');

        Promise.all([
            supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', profile.id),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
            supabase.from('categories').select('id, slug'),
            supabase.from('user_targeted_categories').select('category_id, priority').eq('user_id', profile.id).order('priority'),
            supabase.from('user_environments').select('environment_id').eq('user_id', profile.id),
        ]).then(async ([envsRes, userEquipRes, envEqRes, catsRes, targetedRes, userEnvsRes]) => {
            // Categories
            const catItems: CategoryItem[] = (catsRes.data ?? []).map(c => ({
                id: c.id, slug: c.slug, label: CATEGORY_LABELS[c.slug] ?? c.slug,
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
            setLoading(false);
        });
    }, [visible]);

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

    function toggleEquipment(id: string) {
        setSelectedEquipmentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function goBack() {
        if (phase === 'environment') setPhase('sport');
        else if (phase === 'equipment') setPhase('environment');
        else if (phase === 'goals') {
            if (goalsSubPhase === 'rank') setGoalsSubPhase('select');
            else setPhase('equipment');
        }
        else if (phase === 'body') setPhase('goals');
        else if (phase === 'schedule') setPhase('body');
        else onClose();
    }

    async function generate() {
        setPhase('generating');
        setGenerateError(null);
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

            // 5. Update goals (targeted categories with priority)
            await supabase.from('user_targeted_categories').delete().eq('user_id', profile.id);
            if (rankedCategories.length > 0) {
                await supabase.from('user_targeted_categories').insert(
                    rankedCategories.map((cat, i) => ({ user_id: profile.id, category_id: cat.id, priority: i + 1 }))
                );
            }

            // 6. Update preferred workout days + notes
            await supabase.from('user_profiles')
                .update({
                    preferred_workout_days: [...preferredDays].sort((a, b) => a - b),
                    schedule_notes: scheduleNotes.trim() || null,
                })
                .eq('id', profile.id);

            // 7. Generate plan
            const { error } = await supabase.functions.invoke('generate-trainings-plan');
            if (error) throw error;

            setPlanReady(true);
        } catch (err: any) {
            setGenerateError(err?.message ?? 'Plan konnte nicht erstellt werden.');
        }
    }

    const canProceedSport = !!selectedSportSlug;
    const canProceedEnv = selectedEnvIds.size > 0;

    function handleNext() {
        if (phase === 'sport') setPhase('environment');
        else if (phase === 'environment') goToEquipment();
        else if (phase === 'equipment') { setGoalsSubPhase('select'); setPhase('goals'); }
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
    }

    const canProceedNext =
        phase === 'sport' ? canProceedSport :
        phase === 'environment' ? canProceedEnv :
        phase === 'goals' ? selectedCategoryIds.size > 0 :
        phase === 'schedule' ? preferredDays.size >= 2 :
        true;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

                {/* Header */}
                {phase !== 'generating' && (
                    <View style={[styles.header]}>
                        <Pressable onPress={goBack} hitSlop={12}>
                            <Ionicons
                                name={phase === 'sport' ? 'close' : 'arrow-back'}
                                size={24}
                                color={theme.text}
                            />
                        </Pressable>
                        <View style={styles.headerCenter}>
                            <JempText type="body-l" color={theme.textMuted}>Neuen Plan erstellen</JempText>
                            <StepBars phase={phase} />
                        </View>
                        <View style={{ width: 24 }} />
                    </View>
                )}

                {/* ── Sport ── */}
                {phase === 'sport' && (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Sportart</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wähle deine Hauptsportart für den neuen Plan.
                        </JempText>
                        {SPORT_GROUPS.map(group => (
                            <View key={group.title} style={styles.group}>
                                <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                                    {group.title.toUpperCase()}
                                </JempText>
                                <View style={styles.chipGrid}>
                                    {group.sports.map(sport => (
                                        <SelectableChip
                                            key={sport.slug}
                                            label={sport.label}
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
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Umgebung</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wo trainierst du? Wähle alle zutreffenden Umgebungen.
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
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Equipment</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wähle das Equipment das du zur Verfügung hast.
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
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Ziele</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Welche Bereiche möchtest du verbessern?
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
                                <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Priorität</JempText>
                                <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                                    Ordne deine Ziele — das Wichtigste zuerst.
                                </JempText>
                            </View>
                        }
                    />
                )}

                {/* ── Body data ── */}
                {phase === 'body' && (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Körperdaten</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Aktuelle Angaben helfen dem KI einen präziseren Plan zu erstellen.
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
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Trainingstage</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            An welchen Tagen möchtest du trainieren? Mindestens 2 Tage.
                        </JempText>
                        <View style={styles.dayList}>
                            {WEEK_DAYS.map(({ dow, label }) => {
                                const selected = preferredDays.has(dow);
                                return (
                                    <TouchableOpacity
                                        key={dow}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.dayRow,
                                            { backgroundColor: theme.surface },
                                            selected
                                                ? { borderWidth: 1, borderColor: GradientMid }
                                                : { borderWidth: 1, borderColor: 'transparent' },
                                        ]}
                                        onPress={() => setPreferredDays(prev => {
                                            const next = new Set(prev);
                                            if (next.has(dow) && next.size <= 2) return prev;
                                            next.has(dow) ? next.delete(dow) : next.add(dow);
                                            return next;
                                        })}
                                    >
                                        <JempText type="body-l" color={selected ? '#fff' : theme.text}>
                                            {label}
                                        </JempText>
                                        {selected
                                            ? <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                            : <View style={[styles.dayEmptyCheck, { borderColor: theme.borderStrong }]} />
                                        }
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <JempText type="caption" color={theme.textMuted} style={styles.notesLabel}>
                            Zusätzliche Hinweise
                        </JempText>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                            Z.B. "Mittwochs habe ich Fußballtraining — lieber eine leichte Session."
                        </JempText>
                        <JempInput
                            value={scheduleNotes}
                            onChangeText={setScheduleNotes}
                            placeholder="Optionale Hinweise für den Trainer..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={styles.notesInput}
                        />
                    </KeyboardAwareScrollView>
                )}

                {/* ── Generating ── */}
                {phase === 'generating' && (
                    <GeneratingView
                        error={generateError}
                        isComplete={planReady}
                        onRetry={generate}
                        onClose={onClose}
                        onAnimationComplete={onComplete}
                    />
                )}

                {/* Fixed bottom button */}
                {phase !== 'generating' && (
                    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                        <Pressable
                            onPress={phase === 'schedule' ? generate : handleNext}
                            disabled={!canProceedNext}
                            style={styles.bottomBtn}
                        >
                            <LinearGradient
                                colors={canProceedNext ? GRADIENT : [theme.surface, theme.surface]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.bottomBtnGradient}
                            >
                                <JempText type="button" color={canProceedNext ? '#fff' : theme.textMuted}>
                                    {phase === 'schedule' ? 'Erstellen' : 'Weiter'}
                                </JempText>
                            </LinearGradient>
                        </Pressable>
                    </View>
                )}
            </View>
        </Modal>
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
    dayList: { gap: 10 },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    dayEmptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    notesLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 28,
        marginBottom: 10,
    },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
});
