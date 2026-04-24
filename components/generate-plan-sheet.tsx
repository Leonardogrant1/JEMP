import { JempText } from '@/components/jemp-text';
import { SPORT_GROUPS } from '@/constants/sports';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { UserProfile } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated, Easing, KeyboardAvoidingView, Modal, Platform,
    Pressable, ScrollView, StyleSheet, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'sport' | 'environment' | 'equipment' | 'body' | 'generating';

interface EnvItem { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap }
interface EquipmentItem { id: string; slug: string }

interface Props {
    visible: boolean;
    profile: UserProfile;
    onClose: () => void;
    onComplete: () => void;
}

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];
const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'body'];

const ENV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gym: 'barbell-outline',
    outdoor: 'leaf-outline',
    home: 'home-outline',
};

// ─── Generating animation ─────────────────────────────────────────────────────

function GeneratingView({ error, onRetry, onClose }: {
    error: string | null;
    onRetry: () => void;
    onClose: () => void;
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const ring1 = useRef(new Animated.Value(1)).current;
    const ring2 = useRef(new Animated.Value(1)).current;
    const ring3 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (error) return;
        const pulse = (val: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                ])
            );
        const a1 = pulse(ring1, 0);
        const a2 = pulse(ring2, 300);
        const a3 = pulse(ring3, 600);
        a1.start(); a2.start(); a3.start();
        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, [error]);

    if (error) {
        return (
            <View style={styles.generatingCenter}>
                <View style={[styles.errorIconBox, { backgroundColor: '#ef444418' }]}>
                    <Ionicons name="close-circle-outline" size={52} color="#ef4444" />
                </View>
                <JempText type="h2" color={theme.text} style={styles.generatingTitle}>
                    Fehler beim Erstellen
                </JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.generatingSubtitle}>
                    {error}
                </JempText>
                <View style={styles.errorActions}>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.surface }]}
                        onPress={onRetry}
                        activeOpacity={0.7}
                    >
                        <JempText type="body-l" color={theme.text}>Erneut versuchen</JempText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <JempText type="caption" color={theme.textMuted}>Schließen</JempText>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.generatingCenter}>
            {/* Pulsing rings */}
            <View style={styles.ringContainer}>
                {[ring3, ring2, ring1].map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.ring,
                            {
                                position: 'absolute',
                                opacity: 0.08 + i * 0.06,
                                transform: [{ scale: anim }],
                            },
                        ]}
                    >
                        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                ))}
                {/* Core orb */}
                <LinearGradient
                    colors={GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.orb}
                >
                    <Ionicons name="barbell-outline" size={32} color="#fff" />
                </LinearGradient>
            </View>

            <JempText type="h2" color={theme.text} style={styles.generatingTitle}>
                Plan wird erstellt
            </JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.generatingSubtitle}>
                KI analysiert dein Profil und erstellt{'\n'}einen personalisierten Trainingsplan…
            </JempText>
        </View>
    );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ phase }: { phase: Phase }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const idx = PHASES.indexOf(phase);

    return (
        <View style={styles.stepDots}>
            {PHASES.map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.stepDot,
                        { backgroundColor: i <= idx ? Cyan[500] : theme.borderStrong },
                        i === idx && styles.stepDotActive,
                    ]}
                />
            ))}
        </View>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GeneratePlanSheet({ visible, profile, onClose, onComplete }: Props) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();

    const [phase, setPhase] = useState<Phase>('sport');
    const [loading, setLoading] = useState(true);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Sport
    const [selectedSportSlug, setSelectedSportSlug] = useState<string | null>(null);

    // Environment
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());

    // Equipment
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

    // Body
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    // Pre-fill on open
    useEffect(() => {
        if (!visible) return;
        setPhase('sport');
        setGenerateError(null);
        setLoading(true);

        // Pre-fill body data
        setWeight(profile.weight_in_kg ? String(profile.weight_in_kg) : '');
        setHeight(profile.height_in_cm ? String(profile.height_in_cm) : '');
        // Pre-fill sport
        setSelectedSportSlug(profile.sport?.slug ?? null);

        Promise.all([
            supabase.from('environments').select('id, slug'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', profile.id),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug)'),
        ]).then(async ([envsRes, userEquipRes, envEqRes]) => {
            const currentIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));
            setSelectedEquipmentIds(currentIds);

            // Build envId → EquipmentItem[] map
            const byEnv = new Map<string, EquipmentItem[]>();
            for (const row of envEqRes.data ?? []) {
                const eq = (row.equipment as any);
                if (!eq) continue;
                if (!byEnv.has(row.environment_id)) byEnv.set(row.environment_id, []);
                byEnv.get(row.environment_id)!.push({ id: eq.id, slug: eq.slug });
            }
            setEquipmentByEnv(byEnv);

            if (envsRes.data) {
                const envItems: EnvItem[] = envsRes.data.map(e => ({
                    id: e.id,
                    slug: e.slug,
                    icon: ENV_ICONS[e.slug] ?? 'location-outline',
                }));
                setAllEnvs(envItems);

                // Pre-select environments based on current equipment
                if (currentIds.size > 0) {
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
        else if (phase === 'body') setPhase('equipment');
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

            // 2. Update weight / height
            const weightNum = parseFloat(weight);
            const heightNum = parseFloat(height);
            await supabase.from('user_profiles').update({
                ...(weightNum > 0 && { weight_in_kg: weightNum }),
                ...(heightNum > 0 && { height_in_cm: heightNum }),
            }).eq('id', profile.id);

            // 3. Update equipment
            await supabase.from('user_equipments').delete().eq('user_id', profile.id);
            if (selectedEquipmentIds.size > 0) {
                await supabase.from('user_equipments').insert(
                    [...selectedEquipmentIds].map(equipment_id => ({ user_id: profile.id, equipment_id }))
                );
            }

            // 4. Generate plan
            const { error } = await supabase.functions.invoke('generate-trainings-plan');
            if (error) throw error;

            onComplete();
        } catch (err: any) {
            setGenerateError(err?.message ?? 'Plan konnte nicht erstellt werden.');
        }
    }

    const canProceedSport = !!selectedSportSlug;
    const canProceedEnv = selectedEnvIds.size > 0;

    function handleNext() {
        if (phase === 'sport') setPhase('environment');
        else if (phase === 'environment') goToEquipment();
        else if (phase === 'equipment') setPhase('body');
    }

    const canProceedNext = phase === 'sport' ? canProceedSport : phase === 'environment' ? canProceedEnv : true;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

                {/* Header */}
                {phase !== 'generating' && (
                    <View style={[styles.header, { borderBottomColor: theme.borderDivider }]}>
                        <Pressable onPress={goBack} hitSlop={12}>
                            <Ionicons
                                name={phase === 'sport' ? 'close' : 'arrow-back'}
                                size={24}
                                color={theme.text}
                            />
                        </Pressable>
                        <StepDots phase={phase} />
                        {phase === 'body' ? (
                            <Pressable onPress={generate} hitSlop={12}>
                                <JempText type="body-l" color={theme.text} style={styles.actionBtn}>
                                    Erstellen
                                </JempText>
                            </Pressable>
                        ) : (
                            <Pressable onPress={handleNext} disabled={!canProceedNext} hitSlop={12}>
                                <JempText
                                    type="body-l"
                                    color={canProceedNext ? theme.text : theme.textSubtle}
                                    style={styles.actionBtn}
                                >
                                    Weiter
                                </JempText>
                            </Pressable>
                        )}
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
                                    {group.sports.map(sport => {
                                        const active = selectedSportSlug === sport.slug;
                                        if (active) {
                                            return (
                                                <LinearGradient
                                                    key={sport.slug}
                                                    colors={GRADIENT}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.chipGradientBorder}
                                                >
                                                    <View style={[styles.chipInner, { backgroundColor: theme.surface }]}>
                                                        <JempText type="caption" color={Cyan[400]} style={styles.chipText}>
                                                            {sport.label}
                                                        </JempText>
                                                    </View>
                                                </LinearGradient>
                                            );
                                        }
                                        return (
                                            <TouchableOpacity
                                                key={sport.slug}
                                                style={[styles.chip, { backgroundColor: theme.surface }]}
                                                onPress={() => setSelectedSportSlug(sport.slug)}
                                                activeOpacity={0.7}
                                            >
                                                <JempText type="caption" color={theme.textMuted} style={styles.chipText}>
                                                    {sport.label}
                                                </JempText>
                                            </TouchableOpacity>
                                        );
                                    })}
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
                            {allEnvs.map(env => {
                                const active = selectedEnvIds.has(env.id);
                                if (active) {
                                    return (
                                        <LinearGradient
                                            key={env.id}
                                            colors={GRADIENT}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.envGradientBorder}
                                        >
                                            <TouchableOpacity
                                                style={[styles.envInner, { backgroundColor: theme.surface }]}
                                                onPress={() => toggleEnv(env.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.envIconBox, { backgroundColor: `${Cyan[500]}20` }]}>
                                                    <Ionicons name={env.icon} size={22} color={Cyan[400]} />
                                                </View>
                                                <View style={styles.envText}>
                                                    <JempText type="body-l" color={theme.text}>{t(`environment.${env.slug}` as any)}</JempText>
                                                    <JempText type="caption" color={theme.textMuted}>{t(`environment.${env.slug}_description` as any)}</JempText>
                                                </View>
                                                <Ionicons name="checkmark-circle" size={20} color={Cyan[400]} />
                                            </TouchableOpacity>
                                        </LinearGradient>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={env.id}
                                        style={[styles.envCard, { backgroundColor: theme.surface, borderColor: theme.background }]}
                                        onPress={() => toggleEnv(env.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.envIconBox, { backgroundColor: theme.background }]}>
                                            <Ionicons name={env.icon} size={22} color={theme.textMuted} />
                                        </View>
                                        <View style={styles.envText}>
                                            <JempText type="body-l" color={theme.text}>{t(`environment.${env.slug}` as any)}</JempText>
                                            <JempText type="caption" color={theme.textMuted}>{t(`environment.${env.slug}_description` as any)}</JempText>
                                        </View>
                                        <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
                                    </TouchableOpacity>
                                );
                            })}
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
                            {allEquipment.map(eq => {
                                const active = selectedEquipmentIds.has(eq.id);
                                if (active) {
                                    return (
                                        <TouchableOpacity
                                            key={eq.id}
                                            onPress={() => toggleEquipment(eq.id)}
                                            activeOpacity={0.7}
                                        >
                                            <LinearGradient
                                                colors={GRADIENT}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.chipGradientBorder}
                                            >
                                                <View style={[styles.chipInner, { backgroundColor: theme.surface }]}>
                                                    <JempText type="caption" color={Cyan[400]} style={styles.chipText}>
                                                        {t(`equipment.${eq.slug}` as any)}
                                                    </JempText>
                                                </View>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={eq.id}
                                        style={[styles.chip, { backgroundColor: theme.surface }]}
                                        onPress={() => toggleEquipment(eq.id)}
                                        activeOpacity={0.7}
                                    >
                                        <JempText type="caption" color={theme.textMuted} style={styles.chipText}>
                                            {t(`equipment.${eq.slug}` as any)}
                                        </JempText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {/* ── Body data ── */}
                {phase === 'body' && (
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={insets.top + 56}
                    >
                        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Körperdaten</JempText>
                            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                                Aktuelle Angaben helfen dem KI einen präziseren Plan zu erstellen.
                            </JempText>

                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <JempText type="caption" color={theme.textMuted} style={styles.inputLabel}>
                                        Gewicht
                                    </JempText>
                                    <View style={[styles.inputBox, { backgroundColor: theme.surface }]}>
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            value={weight}
                                            onChangeText={setWeight}
                                            placeholder="75"
                                            placeholderTextColor={theme.textPlaceholder}
                                            keyboardType="decimal-pad"
                                        />
                                        <JempText type="caption" color={theme.textMuted}>kg</JempText>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <JempText type="caption" color={theme.textMuted} style={styles.inputLabel}>
                                        Größe
                                    </JempText>
                                    <View style={[styles.inputBox, { backgroundColor: theme.surface }]}>
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            value={height}
                                            onChangeText={setHeight}
                                            placeholder="180"
                                            placeholderTextColor={theme.textPlaceholder}
                                            keyboardType="number-pad"
                                        />
                                        <JempText type="caption" color={theme.textMuted}>cm</JempText>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                )}

                {/* ── Generating ── */}
                {phase === 'generating' && (
                    <GeneratingView
                        error={generateError}
                        onRetry={generate}
                        onClose={onClose}
                    />
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
    actionBtn: { fontWeight: '600' },

    stepDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    stepDot: { width: 6, height: 6, borderRadius: 3 },
    stepDotActive: { width: 18, borderRadius: 3 },

    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Sport / Equipment chips
    group: { marginBottom: 24 },
    groupTitle: { letterSpacing: 1, fontSize: 11, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipGradientBorder: { borderRadius: 20, padding: 1.5 },
    chipInner: { borderRadius: 18.5, paddingVertical: 7.5, paddingHorizontal: 14.5 },
    chip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
    chipText: { fontSize: 14, fontWeight: '500' },

    // Environment cards
    envList: { gap: 12 },
    envGradientBorder: { borderRadius: 16, padding: 1.5 },
    envInner: {
        borderRadius: 14.5,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    envCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    envIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    envText: { flex: 1, gap: 2 },
    emptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },

    // Body inputs
    inputRow: { flexDirection: 'row', gap: 12 },
    inputGroup: { flex: 1, gap: 8 },
    inputLabel: { letterSpacing: 0.3 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 8,
    },
    input: { flex: 1, fontSize: 17, fontWeight: '500' },

    // Generating
    generatingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },
    ringContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    ring: {
        width: 140,
        height: 140,
        borderRadius: 70,
        overflow: 'hidden',
    },
    orb: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    generatingTitle: { textAlign: 'center' },
    generatingSubtitle: { textAlign: 'center', lineHeight: 20 },

    // Error state
    errorIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    errorActions: { gap: 16, alignItems: 'center', marginTop: 8 },
    retryBtn: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
});
