import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { dowToDayKey } from '@/helpers/date-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdjustRestTimes } from '@/mutations/use-adjust-rest-times';
import { usePlan } from '@/providers/plan-provider';
import { useSessionDetailQuery } from '@/queries/use-session-detail-query';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Reanimated, {
    FadeInDown,
    LinearTransition,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP = 15;
const MIN_ADJUST = -60;
const MAX_ADJUST = 120;

// Stepper-Button mit Press-Feedback: GradientMid-Tint fadet beim Drücken ein
// und beim Loslassen wieder aus. Animiert wird nur die Opacity einer statischen
// Overlay-Fläche — backgroundColor-Interpolation flackert bei Re-Renders,
// weil der Worklet dabei neu erzeugt wird.
function StepButton({ icon, disabled, theme, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    disabled: boolean;
    theme: (typeof Colors)['light'];
    onPress: () => void;
}) {
    const pressed = useSharedValue(0);

    function handlePressIn() {
        pressed.value = withTiming(1, { duration: 100 });
    }

    function handlePressOut() {
        pressed.value = withTiming(0, { duration: 250 });
    }

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: pressed.value,
    }));

    return (
        <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.background, opacity: disabled ? 0.35 : 1 }]}
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
        >
            <Reanimated.View pointerEvents="none" style={[styles.stepBtnOverlay, overlayStyle]} />
            <Ionicons name={icon} size={24} color={theme.text} />
        </Pressable>
    );
}

export default function SessionRestAdjustScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    const { sessions } = usePlan();
    const { mutate: adjustRestTimes } = useAdjustRestTimes();
    const { data: sessionDetail } = useSessionDetailQuery(sessionId);

    const session = sessions.find((s) => s.id === sessionId);

    const [adjust, setAdjust] = useState<number>(session?.rest_adjust_seconds ?? 0);
    const [scope, setScope] = useState<'single' | 'all'>('single');

    const restFallback = sessionDetail ? sessionDetail.pause_between_sets || 60 : 60;

    const dayName = session?.scheduled_at
        ? t(dowToDayKey(new Date(session.scheduled_at.split('T')[0]).getDay()) as any)
        : '';

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
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) runOnJS(goBack)();
        });
    }

    function handleConfirm() {
        if (!session) return;
        adjustRestTimes(
            {
                sessionId,
                workoutPlanSessionId: session.workout_plan_session_id ?? null,
                restAdjustSeconds: adjust === 0 ? null : adjust,
                scope,
            },
            { onSuccess: () => useToastStore.getState().show(t('ui.rest_adjusted')) },
        );
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const adjustLabel = adjust > 0 ? `+${adjust}s` : adjust < 0 ? `${adjust}s` : '±0s';

    // Kompakte Spannen-Vorschau statt Übungsliste: alle Pausen ändern sich ums
    // gleiche Delta, interessant ist nur die resultierende Spanne + der 15s-Clamp
    const baseRests = sessionDetail
        ? sessionDetail.blocks.flatMap((b) => b.exercises.map((ex) => ex.target_rest_seconds || restFallback))
        : [];
    const formatRange = (values: number[]) => {
        const min = Math.min(...values);
        const max = Math.max(...values);
        return min === max ? `${min}s` : `${min}–${max}s`;
    };
    const nextRests = baseRests.map((base) => Math.max(15, base + adjust));
    const restsClamped = baseRests.some((base) => base + adjust < 15);

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            <Reanimated.View
                onLayout={handleSheetLayout}
                style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: windowHeight * 0.85 }, sheetStyle]}
            >
                <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                    <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                    <View style={styles.header}>
                        <JempText type="h2" color={theme.text}>
                            {t('ui.session_rest_title')}
                        </JempText>
                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                            <Ionicons name="close" size={22} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <JempText type="body-l" color={theme.textMuted}>
                        {t('ui.session_rest_body')}
                    </JempText>

                    <View style={styles.stepper}>
                        <StepButton
                            icon="remove"
                            disabled={adjust <= MIN_ADJUST}
                            theme={theme}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAdjust((v) => Math.max(MIN_ADJUST, v - STEP));
                            }}
                        />
                        <View style={styles.stepValue}>
                            <JempText type="h1" color={adjust === 0 ? theme.text : GradientMid}>
                                {adjustLabel}
                            </JempText>
                            <JempText type="caption" color={theme.textMuted}>
                                {adjust === 0 ? t('ui.session_rest_recommended') : t('ui.session_rest_per_pause')}
                            </JempText>
                        </View>
                        <StepButton
                            icon="add"
                            disabled={adjust >= MAX_ADJUST}
                            theme={theme}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAdjust((v) => Math.min(MAX_ADJUST, v + STEP));
                            }}
                        />
                    </View>

                    {baseRests.length > 0 && (
                        <View style={styles.preview}>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.session_rest_preview')}
                            </JempText>
                            <Reanimated.View
                                layout={LinearTransition.duration(200)}
                                style={styles.previewRow}
                            >
                                <View style={[styles.previewChip, { backgroundColor: theme.background }]}>
                                    <JempText type="body-l" color={adjust === 0 ? theme.text : theme.textMuted}>
                                        {formatRange(baseRests)}
                                    </JempText>
                                </View>
                                {adjust !== 0 && (
                                    <>
                                        <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
                                        <Reanimated.View
                                            key={formatRange(nextRests)}
                                            entering={FadeInDown.duration(180)}
                                            style={[styles.previewChip, { backgroundColor: `${GradientMid}18` }]}
                                        >
                                            <JempText type="body-l" color={GradientMid}>
                                                {formatRange(nextRests)}
                                            </JempText>
                                        </Reanimated.View>
                                    </>
                                )}
                            </Reanimated.View>
                            {restsClamped && (
                                <JempText type="caption" color={theme.textMuted}>
                                    {t('ui.session_rest_min_hint')}
                                </JempText>
                            )}
                        </View>
                    )}

                    <View style={styles.scopeOptions}>
                        {(['single', 'all'] as const).map((option) => {
                            const active = scope === option;
                            return (
                                <Pressable
                                    key={option}
                                    style={[
                                        styles.scopeRow,
                                        {
                                            backgroundColor: active ? `${GradientMid}18` : theme.surface,
                                            borderColor: active ? GradientMid : theme.borderCard,
                                        },
                                    ]}
                                    onPress={() => setScope(option)}
                                >
                                    <Ionicons
                                        name={option === 'single' ? 'calendar-outline' : 'repeat-outline'}
                                        size={20}
                                        color={active ? GradientMid : theme.textMuted}
                                    />
                                    <JempText type="body-l" color={active ? GradientMid : theme.text} style={{ flex: 1 }}>
                                        {option === 'single'
                                            ? t('ui.session_rest_scope_single')
                                            : t('ui.session_rest_scope_all', { day: dayName })}
                                    </JempText>
                                    <View style={[
                                        styles.radio,
                                        { borderColor: active ? GradientMid : theme.borderCard },
                                    ]}>
                                        {active && <View style={[styles.radioDot, { backgroundColor: GradientMid }]} />}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                        <JempText type="button" color="#fff">{t('ui.confirm')}</JempText>
                    </Pressable>
                </View>
            </Reanimated.View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
        maxHeight: '100%',
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
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 8,
    },
    stepBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    stepBtnOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `${GradientMid}40`,
    },
    stepValue: {
        alignItems: 'center',
        minWidth: 110,
        gap: 2,
    },
    preview: {
        alignItems: 'center',
        gap: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    previewChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 100,
    },
    scopeOptions: {
        gap: 10,
    },
    scopeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    confirmBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: GradientMid,
    },
});
