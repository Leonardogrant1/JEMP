import { JempText } from '@/components/jemp-text';
import { SessionChip } from '@/components/plan/SessionChip';
import { Colors, GradientMid } from '@/constants/theme';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { formatTargetReps } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchSwapAlternatives, SwapAlternative, SwapAlternativesResponse } from '@/lib/fetch-swap-alternatives';
import { plannedSetCount } from '@/lib/prescription';
import { SwapScope, useSwapExercise } from '@/mutations/use-swap-exercise';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

type SwapParams = {
    sessionId: string;
    blockExerciseId: string;
    planBlockExerciseId: string;
    scheduledAt: string;
    exerciseId: string;
    hasLoggedSets: string;
};

// Kurz-Vorgabe für eine Zeile: Sätze × Wiederholungen/Dauer/Distanz — eine
// Formel für alle drei Messtypen, analog zu den Prescription-Helfern.
function formatAlternativeLine(p: SwapAlternative['prescription']): string {
    const sets = plannedSetCount(p);
    // Truthiness würde ein reales "0" fälschlich auf das Reps-Format
    // zurückfallen lassen — deshalb explizit auf gesetzt + positiv prüfen.
    if ((p.target_duration_seconds ?? 0) > 0) return `${sets}×${p.target_duration_seconds}s`;
    if ((p.target_distance_meters ?? 0) > 0) return `${sets}×${p.target_distance_meters}m`;
    return `${sets}×${formatTargetReps(p.target_reps_min, p.target_reps_max)}`;
}

export default function SwapExerciseScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();

    const { sessionId, blockExerciseId, planBlockExerciseId, scheduledAt, exerciseId, hasLoggedSets } =
        useLocalSearchParams<SwapParams>();
    const alreadyLogged = hasLoggedSets === '1';

    const { mutateAsync: swapExercise, isPending } = useSwapExercise();
    const [pendingAlternative, setPendingAlternative] = useState<SwapAlternative | null>(null);

    // Kein Fetch, wenn der Tausch ohnehin sofort blockiert ist — vermeidet
    // eine unnötige Anfrage, während der Sheet gar nicht erst aufblitzt.
    const { data, isLoading, isError } = useQuery<SwapAlternativesResponse>({
        queryKey: ['swap-alternatives', blockExerciseId],
        queryFn: () => fetchSwapAlternatives(blockExerciseId),
        enabled: !alreadyLogged,
    });

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    // Eintritts-Animation über onLayout statt useEffect — die Lint-Regel
    // react-hooks/immutability verbietet Shared-Value-Mutation im useEffect
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function handleClose() {
        // Während ein Swap läuft: Backdrop-Tap und X ignorieren, statt das
        // Sheet unter einer laufenden Mutation wegzuanimieren.
        if (isPending) return;
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(goBack);
        });
    }

    // Bereits geloggte Sätze (Spec §4): der Sheet darf nicht mal aufblitzen —
    // sofort Toast + zurück, noch bevor irgendeine Eintritts-Animation läuft.
    useEffect(() => {
        if (!alreadyLogged) return;
        useToastStore.getState().show(t('swap.blocked_logged'));
        router.back();
    }, [alreadyLogged, router, t]);

    function handleLockedTap() {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        useToastStore.getState().show(t('swap.locked_tap_hint'));
    }

    async function performSwap(alternative: SwapAlternative, scope: SwapScope) {
        try {
            await swapExercise({
                sessionId,
                blockExerciseId,
                planBlockExerciseId: planBlockExerciseId || null,
                scheduledAt,
                currentExerciseId: exerciseId,
                alternative,
                scope,
            });
            useToastStore.getState().show(t('swap.success'));
            handleClose();
        } catch (err) {
            const blocked = err instanceof Error && err.message === 'swap_blocked_logged_sets';
            useToastStore.getState().show(blocked ? t('swap.blocked_logged') : t('swap.error'));
            setPendingAlternative(null);
        }
    }

    function handlePickAlternative(alternative: SwapAlternative) {
        // Doppel-Tap-Schutz: deckt die Race vor dem nächsten Re-Render ab —
        // disabled={isPending} auf der Row allein kommt erst nach dem State-Update.
        if (isPending) return;
        if ((data?.future_occurrence_count ?? 0) > 0) {
            setPendingAlternative(alternative);
            return;
        }
        void performSwap(alternative, 'this_session');
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    if (alreadyLogged) return null;

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <Reanimated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                <Pressable style={styles.backdrop} onPress={handleClose} />
            </Reanimated.View>

            <Reanimated.View
                onLayout={handleSheetLayout}
                style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: windowHeight * 0.85 }, sheetStyle]}
            >
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                        <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                        <View style={styles.header}>
                            <View style={styles.headerText}>
                                <JempText type="h2" color={theme.text}>{t('swap.title')}</JempText>
                                <JempText type="body-l" color={theme.textMuted}>{t('swap.subtitle')}</JempText>
                            </View>
                            <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                <Ionicons name="close" size={22} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {pendingAlternative ? (
                            <View style={styles.scopeBlock}>
                                <JempText type="h2" color={theme.text}>{t('swap.scope_title')}</JempText>

                                <Pressable
                                    style={[styles.scopeBtn, { backgroundColor: theme.background }]}
                                    onPress={() => void performSwap(pendingAlternative, 'this_session')}
                                    disabled={isPending}
                                >
                                    <JempText type="body-l" color={theme.text}>{t('swap.scope_this')}</JempText>
                                </Pressable>

                                <TouchableOpacity
                                    style={[styles.scopeBtnPrimary, isPending && styles.scopeBtnDisabled]}
                                    onPress={() => void performSwap(pendingAlternative, 'this_and_future')}
                                    disabled={isPending}
                                    activeOpacity={0.8}
                                >
                                    {isPending ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <JempText type="body-l" color="#fff">{t('swap.scope_future')}</JempText>
                                    )}
                                </TouchableOpacity>

                                <Pressable onPress={() => setPendingAlternative(null)} disabled={isPending} hitSlop={8}>
                                    <JempText type="caption" color={theme.textMuted} style={styles.scopeCancel}>
                                        {t('ui.cancel')}
                                    </JempText>
                                </Pressable>
                            </View>
                        ) : isLoading ? (
                            <ActivityIndicator color={GradientMid} style={styles.spinner} />
                        ) : isError ? (
                            <JempText type="body-l" color={theme.textMuted} style={styles.hint}>
                                {t('swap.error')}
                            </JempText>
                        ) : (
                            <>
                                {(data?.alternatives.length ?? 0) === 0 ? (
                                    <JempText type="body-l" color={theme.textMuted} style={styles.hint}>
                                        {t('swap.empty')}
                                    </JempText>
                                ) : (
                                    <View style={styles.list}>
                                        {data!.alternatives.map((alt) => {
                                            const thumbUrl = exerciseThumbnailUrl(alt.exercise.thumbnail_storage_path);
                                            return (
                                                <Pressable
                                                    key={alt.exercise.id}
                                                    style={[styles.row, { borderColor: theme.borderDivider }]}
                                                    onPress={() => handlePickAlternative(alt)}
                                                    disabled={isPending}
                                                >
                                                    <View style={[styles.thumb, { backgroundColor: theme.background }]}>
                                                        {thumbUrl && (
                                                            <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                                                        )}
                                                    </View>
                                                    <View style={styles.rowInfo}>
                                                        <JempText type="body-l" color={theme.text}>{alt.exercise.name}</JempText>
                                                        {alt.exercise.equipment.length > 0 && (
                                                            <View style={styles.chipRow}>
                                                                {alt.exercise.equipment.map((eq, i) => (
                                                                    <SessionChip key={i} label={eq} />
                                                                ))}
                                                            </View>
                                                        )}
                                                    </View>
                                                    <JempText type="caption" color={theme.textMuted}>
                                                        {formatAlternativeLine(alt.prescription)}
                                                    </JempText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}

                                {(data?.locked.length ?? 0) > 0 && (
                                    <View style={styles.lockedSection}>
                                        <JempText type="caption" color={theme.textMuted}>{t('swap.locked_section')}</JempText>
                                        {data!.locked.map((item) => {
                                            const thumbUrl = exerciseThumbnailUrl(item.exercise.thumbnail_storage_path);
                                            return (
                                                <Pressable
                                                    key={item.exercise.id}
                                                    style={[styles.row, styles.lockedRow, { borderColor: theme.borderDivider }]}
                                                    onPress={handleLockedTap}
                                                >
                                                    <View style={[styles.thumb, { backgroundColor: theme.background }]}>
                                                        {thumbUrl && (
                                                            <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                                                        )}
                                                        <View style={styles.lockBadge}>
                                                            <Ionicons name="lock-closed-outline" size={12} color="#fff" />
                                                        </View>
                                                    </View>
                                                    <View style={styles.rowInfo}>
                                                        <JempText type="body-l" color={theme.text}>{item.exercise.name}</JempText>
                                                        <JempText type="caption" color={theme.textMuted}>
                                                            {t('swap.locked_level', { level: item.unlock_level })}
                                                        </JempText>
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </Reanimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
    headerText: {
        flex: 1,
        gap: 2,
    },
    spinner: {
        marginVertical: 24,
    },
    hint: {
        textAlign: 'center',
        paddingVertical: 24,
    },
    list: {
        gap: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    lockedRow: {
        opacity: 0.45,
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 12,
        overflow: 'hidden',
    },
    lockBadge: {
        position: 'absolute',
        right: 2,
        bottom: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowInfo: {
        flex: 1,
        gap: 6,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    lockedSection: {
        gap: 4,
        marginTop: 8,
    },
    scopeBlock: {
        gap: 12,
        paddingVertical: 8,
    },
    scopeBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    scopeBtnPrimary: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: GradientMid,
    },
    scopeBtnDisabled: {
        opacity: 0.5,
    },
    scopeCancel: {
        textAlign: 'center',
        paddingVertical: 8,
    },
});
