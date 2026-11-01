import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConfirmedChoice, InjuryConstraint } from '@/lib/injury-constraints';
import {
    confirmInjuryConstraints,
    fetchActiveConstraints,
    fetchContraindicationTags,
} from '@/lib/injury-constraints';
import { useStripInjuryViolations } from '@/mutations/use-strip-injury-violations';
import { useToastStore } from '@/stores/toast-store';
import { devError } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
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
type Mode = 'block' | 'light_only' | 'ok';

/**
 * Profil-Sektion „Einschränkungen" (Task 6): Liste der aktiven
 * `user_injury_constraints`, Modus änderbar, „Ausgeheilt" (revoke), manuell
 * neue Tags hinzufügen. Jede Änderung committed sofort via
 * `confirmInjuryConstraints` (volle choices-Liste aus dem aktuellen State,
 * nur der editierte Eintrag geändert, sourceNote null, origin 'manual').
 *
 * Verschärfung/Neuanlage eines `block`-Constraints löst `stripInjuryViolations`
 * auf dem aktiven Plan aus + Dialog „Übungen entfernt — neu generieren?".
 * Lockern/Revoke wirkt nur "ab der nächsten Generierung" (kein Strip nötig —
 * weniger Exclusions bedeuten nie, dass eine geplante Übung ungültig wird).
 */
export default function InjurySettingsScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const stripMutation = useStripInjuryViolations();

    const [loading, setLoading] = useState(true);
    const [activeConstraints, setActiveConstraints] = useState<InjuryConstraint[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [savingSlug, setSavingSlug] = useState<string | null>(null);
    // Review Fix 1: ein neuer Tag darf NIE direkt mit einem Default-Modus
    // geschrieben werden — ein versehentlicher Tap im Picker würde sonst
    // sofort einen (teils irreversiblen) Strip auf 'block' auslösen, bevor
    // der User überhaupt einen Modus gewählt hat. Tap wählt den Tag nur lokal
    // aus; erst der explizite Modus-Chip-Tap unten schreibt.
    const [pendingNewTag, setPendingNewTag] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchActiveConstraints(), fetchContraindicationTags()])
            .then(([constraints, tags]) => {
                setActiveConstraints(constraints);
                setAllTags(tags);
            })
            .catch((err) => {
                devError('injury-settings: initial load failed', err);
                useToastStore.getState().show(t('injuries.profile_save_error'));
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    function handleClose() {
        closeThen(() => router.back());
    }

    // Nach Verschärfung/Neuanlage eines block-Constraints: stript künftige
    // Sessions des aktiven Plans auf Basis ALLER aktuell aktiven block-Tags
    // (idempotent — bereits gestrippte Übungen liefern einfach 0 zurück).
    async function runStrip(constraints: InjuryConstraint[]) {
        try {
            const blockSlugs = constraints.filter((c) => c.mode === 'block').map((c) => c.tag_slug);
            const tags = allTags.length > 0 ? allTags : await fetchContraindicationTags();
            const slugToId = new Map(tags.map((tag) => [tag.slug, tag.id]));
            const blockedTagIds = blockSlugs
                .map((slug) => slugToId.get(slug))
                .filter((id): id is string => !!id);

            const { removedExercises } = await stripMutation.mutateAsync(blockedTagIds);

            if (removedExercises > 0) {
                Alert.alert(
                    t('injuries.strip_removed_title'),
                    `${t('injuries.strip_removed_body', { count: removedExercises })} ${t('injuries.strip_regenerate_question')}`,
                    [
                        { text: t('injuries.strip_regenerate_later'), style: 'cancel' },
                        {
                            text: t('injuries.strip_regenerate_confirm'),
                            onPress: () => closeThen(() => {
                                router.back();
                                router.push('/new-plan');
                            }),
                        },
                    ],
                );
            } else {
                useToastStore.getState().show(t('injuries.strip_softened_hint'));
            }
        } catch (err) {
            // Fail-closed: der Constraint selbst ist bereits bestätigt (schützt
            // künftige Generierungen) — ein Strip-Fehler darf das nicht als
            // Erfolg vortäuschen, der User erfährt es per Toast statt eines
            // stillschweigend übersprungenen Schritts.
            devError('injury-settings: strip failed', err);
            useToastStore.getState().show(t('injuries.profile_save_error'));
        }
    }

    async function applyChange(tagSlug: string, mode: Mode) {
        if (savingSlug) return;
        setSavingSlug(tagSlug);
        const previous = activeConstraints.find((c) => c.tag_slug === tagSlug);
        const wasBlock = previous?.mode === 'block';
        const isBlock = mode === 'block';

        const choices: ConfirmedChoice[] = activeConstraints
            .filter((c) => c.tag_slug !== tagSlug)
            .map((c) => ({ tag_slug: c.tag_slug, mode: c.mode, acute: c.acute }));
        if (mode !== 'ok') {
            choices.push({ tag_slug: tagSlug, mode, acute: previous?.acute ?? false });
        }

        try {
            await confirmInjuryConstraints(choices, null, 'manual');
            const refreshed = await fetchActiveConstraints();
            setActiveConstraints(refreshed);

            if (isBlock && !wasBlock) {
                await runStrip(refreshed);
            } else {
                useToastStore.getState().show(t('injuries.strip_softened_hint'));
            }
        } catch (err) {
            devError('injury-settings: applyChange failed', err);
            useToastStore.getState().show(t('injuries.profile_save_error'));
        } finally {
            setSavingSlug(null);
        }
    }

    // Committed erst, wenn der User im ausgeklappten Modus-Chip-Row explizit
    // 'block' oder 'light_only' gewählt hat (Review Fix 1).
    async function commitNewTag(tagSlug: string, mode: 'block' | 'light_only') {
        setPendingNewTag(null);
        await applyChange(tagSlug, mode);
    }

    function tagLabel(slug: string): string {
        return t(`injuries.tag_${slug}` as any) as unknown as string;
    }

    const unusedTags = allTags.filter((tag) => !activeConstraints.some((c) => c.tag_slug === tag.slug));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
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
                                        {t('injuries.profile_title')}
                                    </JempText>
                                    <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>
                                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                                    {t('injuries.profile_subtitle')}
                                </JempText>

                                {loading ? (
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color={theme.textMuted} />
                                    </View>
                                ) : (
                                    <View style={styles.body}>
                                        {activeConstraints.length === 0 ? (
                                            <JempText type="body-sm" color={theme.textMuted}>
                                                {t('injuries.profile_empty')}
                                            </JempText>
                                        ) : (
                                            activeConstraints.map((c) => {
                                                const isSaving = savingSlug === c.tag_slug;
                                                return (
                                                    <View key={c.id} style={[styles.card, { backgroundColor: theme.background }]}>
                                                        <View style={styles.cardHeader}>
                                                            <JempText type="body-l" style={styles.tagLabel}>
                                                                {tagLabel(c.tag_slug)}
                                                            </JempText>
                                                            {isSaving && <ActivityIndicator size="small" color={theme.textMuted} />}
                                                        </View>
                                                        <View style={styles.chipRow}>
                                                            <SelectableChip
                                                                label={t('injuries.choice_block')}
                                                                selected={c.mode === 'block'}
                                                                color="#ef4444"
                                                                size="sm"
                                                                onPress={() => applyChange(c.tag_slug, 'block')}
                                                            />
                                                            <SelectableChip
                                                                label={t('injuries.choice_light')}
                                                                selected={c.mode === 'light_only'}
                                                                color="#f59e0b"
                                                                size="sm"
                                                                onPress={() => applyChange(c.tag_slug, 'light_only')}
                                                            />
                                                            <SelectableChip
                                                                label={t('injuries.recheck_healed')}
                                                                selected={false}
                                                                color="#22c55e"
                                                                size="sm"
                                                                onPress={() => applyChange(c.tag_slug, 'ok')}
                                                            />
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}

                                        {unusedTags.length > 0 && (
                                            <View style={styles.addSection}>
                                                <JempText type="body-l" style={styles.sectionTitle}>
                                                    {t('injuries.profile_add_title')}
                                                </JempText>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
                                                    {unusedTags.map((tag) => (
                                                        <SelectableChip
                                                            key={tag.id}
                                                            label={tagLabel(tag.slug)}
                                                            selected={pendingNewTag === tag.slug}
                                                            color={GradientMid}
                                                            size="sm"
                                                            onPress={() => setPendingNewTag((prev) => (prev === tag.slug ? null : tag.slug))}
                                                        />
                                                    ))}
                                                </ScrollView>

                                                {pendingNewTag && (
                                                    <View style={[styles.card, { backgroundColor: theme.background }]}>
                                                        <View style={styles.cardHeader}>
                                                            <JempText type="body-l" style={styles.tagLabel}>
                                                                {tagLabel(pendingNewTag)}
                                                            </JempText>
                                                            <TouchableOpacity onPress={() => setPendingNewTag(null)} hitSlop={8}>
                                                                <Ionicons name="close" size={18} color={theme.textMuted} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        <View style={styles.chipRow}>
                                                            <SelectableChip
                                                                label={t('injuries.choice_block')}
                                                                selected={false}
                                                                color="#ef4444"
                                                                size="sm"
                                                                onPress={() => commitNewTag(pendingNewTag, 'block')}
                                                            />
                                                            <SelectableChip
                                                                label={t('injuries.choice_light')}
                                                                selected={false}
                                                                color="#f59e0b"
                                                                size="sm"
                                                                onPress={() => commitNewTag(pendingNewTag, 'light_only')}
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
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
    loadingBox: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    body: { gap: 16 },
    card: {
        borderRadius: 16,
        padding: 16,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tagLabel: { fontWeight: '600' as const },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    addSection: { gap: 10 },
    sectionTitle: { marginBottom: 2 },
    tagScroll: { gap: 8, paddingRight: 8 },
});
