import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { dowToDayKey } from '@/helpers/date-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdjustRestTimes } from '@/mutations/use-adjust-rest-times';
import { usePlan } from '@/providers/plan-provider';
import { useSessionDetailQuery } from '@/queries/use-session-detail-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP = 15;
const MIN_ADJUST = -60;
const MAX_ADJUST = 120;

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

    useEffect(() => {
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }, []);

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
        adjustRestTimes({
            sessionId,
            workoutPlanSessionId: session.workout_plan_session_id ?? null,
            restAdjustSeconds: adjust === 0 ? null : adjust,
            scope,
        });
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const adjustLabel = adjust > 0 ? `+${adjust}s` : adjust < 0 ? `${adjust}s` : '±0s';

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            <Reanimated.View
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
                        <Pressable
                            style={[styles.stepBtn, { backgroundColor: theme.background, opacity: adjust <= MIN_ADJUST ? 0.35 : 1 }]}
                            disabled={adjust <= MIN_ADJUST}
                            onPress={() => setAdjust((v) => Math.max(MIN_ADJUST, v - STEP))}
                        >
                            <Ionicons name="remove" size={24} color={theme.text} />
                        </Pressable>
                        <View style={styles.stepValue}>
                            <JempText type="h1" color={adjust === 0 ? theme.text : GradientMid}>
                                {adjustLabel}
                            </JempText>
                            <JempText type="caption" color={theme.textMuted}>
                                {adjust === 0 ? t('ui.session_rest_recommended') : t('ui.session_rest_per_pause')}
                            </JempText>
                        </View>
                        <Pressable
                            style={[styles.stepBtn, { backgroundColor: theme.background, opacity: adjust >= MAX_ADJUST ? 0.35 : 1 }]}
                            disabled={adjust >= MAX_ADJUST}
                            onPress={() => setAdjust((v) => Math.min(MAX_ADJUST, v + STEP))}
                        >
                            <Ionicons name="add" size={24} color={theme.text} />
                        </Pressable>
                    </View>

                    {sessionDetail && sessionDetail.blocks.length > 0 && (
                        <View style={[styles.preview, { backgroundColor: theme.background }]}>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.session_rest_preview')}
                            </JempText>
                            <ScrollView
                                style={styles.previewScroll}
                                showsVerticalScrollIndicator
                                nestedScrollEnabled
                            >
                                {sessionDetail.blocks.map((block) => (
                                    <View key={block.id} style={styles.previewBlock}>
                                        {block.block_type && (
                                            <JempText type="caption" color={theme.textMuted} style={styles.previewBlockTitle}>
                                                {t(`block_type.${block.block_type.slug}` as any)}
                                            </JempText>
                                        )}
                                        {block.exercises.map((ex) => {
                                            const base = ex.target_rest_seconds || restFallback;
                                            const next = Math.max(15, base + adjust);
                                            return (
                                                <View key={ex.id} style={styles.previewRow}>
                                                    <JempText
                                                        type="body-sm"
                                                        color={theme.text}
                                                        numberOfLines={1}
                                                        style={styles.previewName}
                                                    >
                                                        {ex.exercise?.name}
                                                    </JempText>
                                                    <JempText type="body-sm" color={next === base ? theme.text : theme.textMuted}>
                                                        {base}s
                                                    </JempText>
                                                    {next !== base && (
                                                        <>
                                                            <Ionicons name="arrow-forward" size={12} color={theme.textMuted} />
                                                            <JempText type="body-sm" color={GradientMid}>{next}s</JempText>
                                                        </>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </ScrollView>
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
    },
    stepValue: {
        alignItems: 'center',
        minWidth: 110,
        gap: 2,
    },
    preview: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
        flexShrink: 1,
    },
    previewScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    previewBlock: {
        gap: 4,
        marginBottom: 10,
    },
    previewBlockTitle: {
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewName: {
        flex: 1,
        marginRight: 8,
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
