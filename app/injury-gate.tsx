import { ConstraintChoiceList } from '@/components/injuries/ConstraintChoiceList';
import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConfirmedChoice, ExtractionResult, InjuryConstraint } from '@/lib/injury-constraints';
import {
    confirmInjuryConstraints,
    fetchContraindicationTags,
    markExtractionFailed,
    requestExtraction,
} from '@/lib/injury-constraints';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useStripInjuryViolations } from '@/mutations/use-strip-injury-violations';
import { useInjuryGateStore } from '@/stores/injury-gate-store';
import { useToastStore } from '@/stores/toast-store';
import { devError } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

type Tag = { id: string; slug: string };
type Theme = (typeof Colors)['light'];
type Mode = 'block' | 'light_only' | 'ok';

/**
 * Blocking Rest-Gate (Spec §5) — gepusht von ensureInjuryGate
 * (stores/injury-gate-store.ts) vor jedem Plan-Generierungs-Trigger.
 * Kein Dead-End: Extraktion mit 15s-Timeout (requestExtraction) fällt bei
 * Fehler/Timeout auf eine manuelle Tag-Auswahl inkl. prominenter
 * "Keine Einschränkungen"-Option zurück, der User erreicht den Plan immer.
 */
export default function InjuryGateScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const stripMutation = useStripInjuryViolations();

    const gateCase = useInjuryGateStore((s) => s.gateCase);
    const sourceNote = useInjuryGateStore((s) => s.sourceNote);
    const activeConstraints = useInjuryGateStore((s) => s.activeConstraints);

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideValue.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayValue.value }));

    function closeThen(action: () => void) {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(action);
        });
    }

    // Abbrechen schließt nur das Sheet — der ursprüngliche Trigger bleibt
    // unausgeführt, der User landet dort, wo er war, und kann es jederzeit
    // erneut versuchen. Kein Sackgassen-Risiko, nur ein verschobener Versuch.
    function handleDismiss() {
        closeThen(() => {
            router.back();
            useInjuryGateStore.getState().clear();
        });
    }

    function finish(constraintCount: number) {
        trackerManager.track('injury_gate_passed', { case: gateCase, constraint_count: constraintCount });
        closeThen(() => {
            router.back();
            useInjuryGateStore.getState().pass();
        });
    }

    useEffect(() => {
        if (gateCase) trackerManager.track('injury_gate_shown', { case: gateCase });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [submitting, setSubmitting] = useState(false);

    // Spec §5: jeder block-Add/-Sharpen mit laufendem Plan muss künftige
    // Sessions sofort um die betroffenen Übungen bereinigen — sonst zeigt
    // ein laufender Plan weiterhin eine gerade erst ausgeschlossene Übung,
    // bis die nächste Generierung läuft (injury-settings.tsx macht das
    // bereits für den Settings-Pfad, das Gate hier noch nicht). Konservative
    // Obermenge: ALLE aktuell bestätigten 'block'-Choices gelten als
    // "neu/verschärft" statt echtes Vorher/Nachher-Tracking — idempotent,
    // ein bereits gestrippter Plan liefert einfach 0 zurück. Ein
    // Strip-Fehler darf das Gate NIE blockieren (catch + warn + weiter) —
    // die üblicherweise folgende Plan-Regenerierung deckt es ohnehin erneut ab.
    async function stripNewlyBlocked(choices: ConfirmedChoice[]) {
        try {
            const blockedSlugs = choices.filter((c) => c.mode === 'block').map((c) => c.tag_slug);
            if (blockedSlugs.length === 0) return;
            const tags = await fetchContraindicationTags();
            const slugToId = new Map(tags.map((tag) => [tag.slug, tag.id]));
            const blockedTagIds = blockedSlugs
                .map((slug) => slugToId.get(slug))
                .filter((id): id is string => !!id);
            if (blockedTagIds.length > 0) {
                await stripMutation.mutateAsync(blockedTagIds);
            }
        } catch (err) {
            console.warn('injury-gate: stripInjuryViolations failed', err);
        }
    }

    async function submit(choices: ConfirmedChoice[], origin: 'manual' | 'recheck') {
        if (submitting) return;
        setSubmitting(true);
        try {
            await confirmInjuryConstraints(choices, origin === 'recheck' ? null : sourceNote, origin);
            await stripNewlyBlocked(choices);
            finish(choices.filter((c) => c.mode !== 'ok').length);
        } catch (err) {
            devError('injury-gate: confirm failed', err);
            useToastStore.getState().show(t('ui.plan_generate_start_error'));
            setSubmitting(false);
        }
    }

    const isRecheck = gateCase === 'recheck';
    const title = isRecheck ? t('injuries.recheck_title') : t('injuries.gate_title');
    const subtitle = isRecheck ? t('injuries.recheck_subtitle') : t('injuries.gate_subtitle');

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleDismiss}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                <View style={styles.header}>
                                    <JempText type="h2" color={theme.text} style={styles.headerTitle}>
                                        {title}
                                    </JempText>
                                    <TouchableOpacity onPress={handleDismiss} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>
                                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                                    {subtitle}
                                </JempText>

                                {isRecheck ? (
                                    <RecheckBody
                                        activeConstraints={activeConstraints}
                                        theme={theme}
                                        submitting={submitting}
                                        onSubmit={(choices) => submit(choices, 'recheck')}
                                    />
                                ) : (
                                    <ExtractBody
                                        sourceNote={sourceNote}
                                        theme={theme}
                                        submitting={submitting}
                                        onSubmit={(choices) => submit(choices, 'manual')}
                                    />
                                )}
                            </View>
                        </ScrollView>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

function SubmitButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            style={[styles.saveButton, disabled && styles.saveButtonDisabled]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            {disabled ? <ActivityIndicator color="#fff" /> : <JempText type="body-l" color="#fff">{label}</JempText>}
        </TouchableOpacity>
    );
}

// ── extract / retry: Extraktion → ConstraintChoiceList, sonst manueller Fallback ──

function ExtractBody({ sourceNote, theme, submitting, onSubmit }: {
    sourceNote: string | null;
    theme: Theme;
    submitting: boolean;
    onSubmit: (choices: ConfirmedChoice[]) => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const choicesRef = useRef<ConfirmedChoice[]>([]);
    const [manualChoices, setManualChoices] = useState<Record<string, ConfirmedChoice>>({});

    useEffect(() => {
        const note = sourceNote?.trim();
        if (!note) {
            // Nichts (mehr) zu extrahieren — direkt in den manuellen Fallback,
            // Tags aber trotzdem laden, damit er nicht leerläuft.
            fetchContraindicationTags().then(setTags).catch((err) => devError('injury-gate: fetchContraindicationTags failed', err));
            setFailed(true);
            setLoading(false);
            return;
        }
        trackerManager.track('injury_extraction_started', {});
        Promise.all([requestExtraction(note), fetchContraindicationTags()])
            .then(([extraction, allTags]) => {
                setResult(extraction);
                setTags(allTags);
                trackerManager.track('injury_extraction_completed', {
                    constraint_count: extraction.constraints.length,
                    unmapped_count: extraction.unmapped.length,
                });
            })
            .catch((err) => {
                devError('injury-gate: extraction failed', err);
                setFailed(true);
                trackerManager.track('injury_extraction_failed', {
                    error: err instanceof Error ? err.message : String(err),
                });
                markExtractionFailed().catch((markErr) => devError('injury-gate: markExtractionFailed failed', markErr));
                fetchContraindicationTags().then(setTags).catch((tagErr) => devError('injury-gate: fetchContraindicationTags failed', tagErr));
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggleManualTag(slug: string) {
        setManualChoices((prev) => {
            if (prev[slug]) {
                const next = { ...prev };
                delete next[slug];
                return next;
            }
            return { ...prev, [slug]: { tag_slug: slug, mode: 'block', acute: false } };
        });
    }

    function setManualMode(slug: string, mode: Mode) {
        setManualChoices((prev) => ({ ...prev, [slug]: { tag_slug: slug, mode, acute: false } }));
    }

    if (loading) {
        return (
            <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.textMuted} />
                <JempText type="body-sm" color={theme.textMuted} style={styles.loadingText}>
                    {t('injuries.extraction_loading')}
                </JempText>
            </View>
        );
    }

    if (!failed && result) {
        return (
            <View style={styles.body}>
                <ConstraintChoiceList
                    proposals={result.constraints}
                    unmapped={result.unmapped}
                    scheduling={result.scheduling}
                    allTags={tags}
                    onChange={(choices) => { choicesRef.current = choices; }}
                />
                <SubmitButton disabled={submitting} label={t('ui.continue')} onPress={() => onSubmit(choicesRef.current)} />
            </View>
        );
    }

    // Manueller Fallback (Extraktion fehlgeschlagen/getimed out ODER keine
    // Note mehr vorhanden) — Gate ohne Sackgasse: "Keine Einschränkungen"
    // bestätigt mit 0 Constraints, alternativ manuelle Tag-Auswahl.
    return (
        <View style={styles.body}>
            <JempText type="body-sm" color={theme.textMuted}>
                {t('injuries.extraction_failed_hint')}
            </JempText>
            <Pressable
                onPress={() => onSubmit([])}
                disabled={submitting}
                style={[styles.noneOption, { backgroundColor: theme.background }]}
            >
                <JempText type="body-l" color={theme.text}>{t('injuries.none_option')}</JempText>
            </Pressable>
            <JempText type="body-l" style={styles.sectionTitle}>
                {t('injuries.gate_manual_title')}
            </JempText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
                {tags.map((tag) => (
                    <SelectableChip
                        key={tag.id}
                        label={t(`injuries.tag_${tag.slug}` as any) as unknown as string}
                        selected={!!manualChoices[tag.slug]}
                        size="sm"
                        onPress={() => toggleManualTag(tag.slug)}
                    />
                ))}
            </ScrollView>
            {Object.values(manualChoices).map((choice) => (
                <View key={choice.tag_slug} style={[styles.card, { backgroundColor: theme.background }]}>
                    <JempText type="body-sm" color={theme.textMuted}>
                        {t(`injuries.tag_${choice.tag_slug}` as any) as unknown as string}
                    </JempText>
                    <View style={styles.chipRow}>
                        <SelectableChip label={t('injuries.choice_block')} selected={choice.mode === 'block'} color="#ef4444" size="sm" onPress={() => setManualMode(choice.tag_slug, 'block')} />
                        <SelectableChip label={t('injuries.choice_light')} selected={choice.mode === 'light_only'} color="#f59e0b" size="sm" onPress={() => setManualMode(choice.tag_slug, 'light_only')} />
                        <SelectableChip label={t('injuries.choice_ok')} selected={choice.mode === 'ok'} color="#22c55e" size="sm" onPress={() => setManualMode(choice.tag_slug, 'ok')} />
                    </View>
                </View>
            ))}
            <SubmitButton disabled={submitting} label={t('ui.continue')} onPress={() => onSubmit(Object.values(manualChoices))} />
        </View>
    );
}

// ── recheck: aktive Constraints vorbelegt, Ein-Tap-Pfad für "gilt alles noch" ──

type RecheckRow = { mode: Mode; acute: boolean; adjusting: boolean };

function RecheckBody({ activeConstraints, theme, submitting, onSubmit }: {
    activeConstraints: InjuryConstraint[];
    theme: Theme;
    submitting: boolean;
    onSubmit: (choices: ConfirmedChoice[]) => void;
}) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<Record<string, RecheckRow>>(() => {
        const seeded: Record<string, RecheckRow> = {};
        activeConstraints.forEach((c) => {
            seeded[c.tag_slug] = { mode: c.mode, acute: c.acute, adjusting: false };
        });
        return seeded;
    });

    function unchangedChoices(): ConfirmedChoice[] {
        return activeConstraints.map((c) => ({ tag_slug: c.tag_slug, mode: c.mode, acute: c.acute }));
    }

    function currentChoices(): ConfirmedChoice[] {
        return Object.entries(rows).map(([tag_slug, r]) => ({ tag_slug, mode: r.mode, acute: r.acute }));
    }

    function setRowMode(slug: string, mode: Mode, adjusting: boolean) {
        setRows((prev) => ({ ...prev, [slug]: { ...prev[slug], mode, adjusting } }));
    }

    return (
        <View style={styles.body}>
            {/* Ein-Tap-Pfad: "Ja" für alle bestätigt die unveränderten choices,
                unabhängig von etwaigen Einzel-Anpassungen unten. */}
            <Pressable
                onPress={() => onSubmit(unchangedChoices())}
                disabled={submitting}
                style={[styles.noneOption, { backgroundColor: theme.background }]}
            >
                <JempText type="body-l" color={theme.text}>{t('injuries.recheck_all_still_apply')}</JempText>
            </Pressable>

            {activeConstraints.map((c) => {
                const row = rows[c.tag_slug];
                const tagLabel = t(`injuries.tag_${c.tag_slug}` as any) as unknown as string;
                return (
                    <View key={c.id} style={[styles.card, { backgroundColor: theme.background }]}>
                        <JempText type="body-l" style={styles.tagLabel}>
                            {t('injuries.recheck_question', { tag: tagLabel })}
                        </JempText>
                        <View style={styles.chipRow}>
                            <SelectableChip label={t('injuries.recheck_yes')} selected={!row.adjusting && row.mode === c.mode} color="#22c55e" size="sm" onPress={() => setRowMode(c.tag_slug, c.mode, false)} />
                            <SelectableChip label={t('injuries.recheck_healed')} selected={!row.adjusting && row.mode === 'ok'} color="#22c55e" size="sm" onPress={() => setRowMode(c.tag_slug, 'ok', false)} />
                            <SelectableChip label={t('injuries.recheck_adjust')} selected={row.adjusting} color={GradientMid} size="sm" onPress={() => setRowMode(c.tag_slug, row.mode, true)} />
                        </View>
                        {row.adjusting && (
                            <View style={styles.chipRow}>
                                <SelectableChip label={t('injuries.choice_block')} selected={row.mode === 'block'} color="#ef4444" size="sm" onPress={() => setRowMode(c.tag_slug, 'block', true)} />
                                <SelectableChip label={t('injuries.choice_light')} selected={row.mode === 'light_only'} color="#f59e0b" size="sm" onPress={() => setRowMode(c.tag_slug, 'light_only', true)} />
                                <SelectableChip label={t('injuries.choice_ok')} selected={row.mode === 'ok'} color="#22c55e" size="sm" onPress={() => setRowMode(c.tag_slug, 'ok', true)} />
                            </View>
                        )}
                    </View>
                );
            })}

            <SubmitButton disabled={submitting} label={t('ui.confirm')} onPress={() => onSubmit(currentChoices())} />
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerTitle: { flex: 1 },
    subtitle: { lineHeight: 22 },
    body: { gap: 16 },
    loadingBox: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 24,
    },
    loadingText: { lineHeight: 18 },
    noneOption: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    sectionTitle: { marginTop: 4 },
    tagScroll: { gap: 8, paddingRight: 8 },
    card: {
        borderRadius: 16,
        padding: 16,
        gap: 10,
    },
    tagLabel: { fontWeight: '600' as const },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    saveButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        width: '100%',
        overflow: 'hidden',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
});
