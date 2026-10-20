import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { rstDerive, rstInvalidReason, RST_REST_SECONDS, RST_RUN_COUNT } from '@/lib/rst';
import { useCompleteAssessment } from '@/mutations/use-complete-assessment';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserAssessmentQuery } from '@/queries/use-user-assessment-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** RST-Flow (Spec §4.4/§5.5): 6 Zeiten → Drop-off + Durchschnitt → Conditioning-
 *  Score; Lauf 1 füttert den Sprint-Score (Prioritäts-Regel in der Mutation).
 *  Timer-Modus als Default: Stoppuhr pro Lauf + Pausen-Countdown, manuelle
 *  Eingabe bleibt als Fallback (gleiches Toggle wie in assessment/[id]).
 *  Rendert unter der Route assessment/[id] — der Screen wählt die Komponente
 *  anhand des Slugs; die Query teilt sich den Cache-Key mit dem Screen. */
export function RstAssessment({ id }: { id: string }) {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data, isLoading } = useUserAssessmentQuery(id);
    const completeAssessment = useCompleteAssessment();

    const [mode, setMode] = useState<'timer' | 'manual'>('timer');
    const [times, setTimes] = useState<string[]>(Array(RST_RUN_COUNT).fill(''));
    const stopwatch = useStopwatch();

    // Pausen-Countdown über absoluten Endzeitpunkt — übersteht Backgrounding
    // (gleiches Muster wie CooperCountdown).
    const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
    const [, setTick] = useState(0);
    useEffect(() => {
        if (restEndsAt === null) return;
        const interval = setInterval(() => setTick((n) => n + 1), 250);
        return () => clearInterval(interval);
    }, [restEndsAt]);
    const restLeft = restEndsAt !== null ? Math.ceil((restEndsAt - Date.now()) / 1000) : null;
    useEffect(() => {
        if (restLeft !== null && restLeft <= 0) setRestEndsAt(null);
    }, [restLeft]);

    const parsed = mode === 'timer'
        ? stopwatch.attempts
        : times.map((v) => parseFloat(v.replace(',', '.')));
    const allRecorded = mode === 'timer' ? stopwatch.attempts.length >= RST_RUN_COUNT : true;
    const derived = rstDerive(parsed);
    const invalidReason = parsed.length === RST_RUN_COUNT && parsed.every((v) => Number.isFinite(v))
        ? rstInvalidReason(parsed)
        : null;
    const canSubmit = derived !== null && !completeAssessment.isPending;

    function setTime(i: number, v: string) {
        const next = [...times];
        next[i] = v.replace(/[^0-9.,]/g, '');
        setTimes(next);
    }

    function handleStartStop() {
        if (stopwatch.isRunning) {
            stopwatch.stop();
            if (stopwatch.attempts.length + 1 < RST_RUN_COUNT) {
                setRestEndsAt(Date.now() + RST_REST_SECONDS * 1000);
            }
        } else {
            setRestEndsAt(null);
            stopwatch.start();
        }
    }

    function handleReset() {
        stopwatch.reset();
        setRestEndsAt(null);
    }

    function handleSubmit() {
        if (!derived || !profile?.id || !data?.assessment) return;
        const metricId = data.assessment.measured_metric_id;
        if (!metricId || !data.assessment.category_id) return;
        completeAssessment.mutate({
            userAssessmentId: data.id,
            assessmentId: data.assessment.id,
            userId: profile.id,
            metricId,
            value: derived.dropOffPct,
            assessmentSlug: 'repeated_sprint_test',
            categoryId: data.assessment.category_id,
            rstTimes: parsed,
            userProfile: {
                gender: profile.gender as 'male' | 'female',
                weight_kg: profile.weight_in_kg!,
                height_cm: profile.height_in_cm!,
                birth_date: profile.birth_date!,
            },
        }, { onSuccess: () => router.back() });
    }

    if (isLoading || !data) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <ActivityIndicator style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    const description = (data.assessment?.description_i18n as Record<string, string> | null)?.[i18n.language]
        ?? data.assessment?.description;
    const nextRun = stopwatch.attempts.length + 1;
    const displayElapsed = (stopwatch.elapsed / 1000).toFixed(2);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>
                <JempText type="h1" style={styles.title}>{t('rst.title')}</JempText>
                <JempText type="body-sm" color={theme.textMuted} style={styles.subtitle}>
                    {description ?? t('rst.subtitle')}
                </JempText>

                {/* Modus-Toggle — Timer als Default, manuelle Eingabe als Fallback */}
                <View style={[styles.modeToggle, { backgroundColor: theme.surface }]}>
                    {(['timer', 'manual'] as const).map((m) => {
                        const active = mode === m;
                        return (
                            <Pressable
                                key={m}
                                onPress={() => { setMode(m); handleReset(); }}
                                style={styles.modeBtn}
                            >
                                {active && (
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <Ionicons
                                    name={m === 'timer' ? 'timer-outline' : 'create-outline'}
                                    size={14}
                                    color={active ? '#fff' : theme.textMuted}
                                />
                                <JempText type="button" color={active ? '#fff' : theme.textMuted}>
                                    {t(m === 'timer' ? 'ui.assessment_mode_timer' : 'ui.assessment_mode_manual')}
                                </JempText>
                            </Pressable>
                        );
                    })}
                </View>

                {mode === 'timer' ? (
                    <View style={styles.timerSection}>
                        <View style={[styles.timerDisplay, { backgroundColor: theme.surface }]}>
                            {restLeft !== null && !stopwatch.isRunning ? (
                                <>
                                    <JempText type="hero" style={styles.timerDigits} color={Electric[400]}>
                                        {restLeft}
                                    </JempText>
                                    <JempText type="caption" color={theme.textMuted}>{t('rst.rest_label')}</JempText>
                                </>
                            ) : (
                                <>
                                    <JempText type="hero" style={styles.timerDigits} color={stopwatch.isRunning ? Cyan[400] : theme.text}>
                                        {stopwatch.isRunning ? displayElapsed : '0.00'}
                                    </JempText>
                                    <JempText type="caption" color={theme.textMuted}>{t('ui.timer_seconds')}</JempText>
                                </>
                            )}
                        </View>

                        {allRecorded ? (
                            <View style={[styles.doneRow, { backgroundColor: theme.surface }]}>
                                <Ionicons name="checkmark-circle" size={18} color={GradientMid} />
                                <JempText type="body-sm" color={theme.text}>{t('rst.done_label')}</JempText>
                            </View>
                        ) : (
                            <Pressable style={styles.timerBtn} onPress={handleStartStop}>
                                <LinearGradient
                                    colors={stopwatch.isRunning ? ['#ef4444', '#dc2626'] : [Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.timerBtnGradient}
                                >
                                    <Ionicons name={stopwatch.isRunning ? 'stop' : 'play'} size={20} color="#fff" />
                                    <JempText type="button" color="#fff">
                                        {stopwatch.isRunning ? t('ui.timer_stop') : t('rst.start_run', { n: nextRun })}
                                    </JempText>
                                </LinearGradient>
                            </Pressable>
                        )}

                        {stopwatch.attempts.length > 0 && (
                            <View style={styles.runsList}>
                                {stopwatch.attempts.map((time, i) => (
                                    <View key={i} style={[styles.runRow, { backgroundColor: theme.surface }]}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('rst.run_label', { n: i + 1 })}
                                        </JempText>
                                        <JempText type="body-l" color={theme.text}>{time.toFixed(2)}s</JempText>
                                    </View>
                                ))}
                                <Pressable onPress={handleReset} style={styles.resetBtn} hitSlop={8}>
                                    <Ionicons name="refresh" size={14} color={theme.textMuted} />
                                    <JempText type="caption" color={theme.textMuted}>{t('ui.reset')}</JempText>
                                </Pressable>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {times.map((v, i) => (
                            <View key={i} style={styles.cell}>
                                <JempText type="caption" color={theme.textMuted}>{t('rst.run_label', { n: i + 1 })}</JempText>
                                <TextInput
                                    value={v}
                                    onChangeText={(text) => setTime(i, text)}
                                    keyboardType="decimal-pad"
                                    placeholder="4.5"
                                    placeholderTextColor={theme.textSubtle}
                                    style={[styles.input, { color: theme.text, borderColor: v ? GradientMid : theme.borderStrong }]}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {derived && (
                    <JempText type="body-sm" color={GradientMid} style={styles.derived}>
                        {`Drop-off ${derived.dropOffPct}% · Ø ${derived.meanTime}s`}
                    </JempText>
                )}
                {invalidReason && (
                    <JempText type="body-sm" color="#ef4444" style={styles.derived}>
                        {t(invalidReason === 'range' ? 'rst.out_of_range' : 'rst.implausible')}
                    </JempText>
                )}

                <Pressable onPress={handleSubmit} disabled={!canSubmit} style={[styles.submitWrap, { opacity: canSubmit ? 1 : 0.4 }]}>
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submit}>
                        {completeAssessment.isPending
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color="#fff">{t('rst.submit')}</JempText>}
                    </LinearGradient>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    backBtn: { marginTop: 8, marginBottom: 12, alignSelf: 'flex-start' },
    title: { marginBottom: 8 },
    subtitle: { marginBottom: 20, lineHeight: 19 },

    modeToggle: { flexDirection: 'row', borderRadius: 100, padding: 3, gap: 2, marginBottom: 20 },
    modeBtn: {
        flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 8, borderRadius: 100,
        overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    },

    timerSection: { gap: 16 },
    timerDisplay: { borderRadius: 20, paddingVertical: 28, alignItems: 'center', gap: 4 },
    timerDigits: { fontVariant: ['tabular-nums'] },
    timerBtn: { borderRadius: 100, overflow: 'hidden' },
    timerBtnGradient: { height: 52, borderRadius: 100, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
    doneRow: { height: 52, borderRadius: 100, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },

    runsList: { gap: 8 },
    runRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    },
    resetBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'center', paddingVertical: 6 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    cell: { width: '30%', gap: 4 },
    input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 20, textAlign: 'center' },
    derived: { marginTop: 16, textAlign: 'center' },
    submitWrap: { marginTop: 24 },
    submit: { height: 52, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
});
