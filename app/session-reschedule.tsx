import GameIcon from '@/assets/icons/game.svg';
import Logo from '@/assets/icons/logo.svg';
import { JempText } from '@/components/jemp-text';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { Colors, GradientMid } from '@/constants/theme';
import { DAY_KEYS, dowToDayKey, getWeekDays, toDateStr } from '@/helpers/date-helpers';
import { getDayVariant } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimation } from '@/hooks/use-training-animation';
import LottieView from 'lottie-react-native';
import { useRescheduleAllSessions } from '@/mutations/use-reschedule-all-sessions';
import { useRescheduleSession } from '@/mutations/use-reschedule-session';
import { useCurrentUser } from '@/providers/current-user-provider';
import { type WorkoutSession, usePlan } from '@/providers/plan-provider';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SessionRescheduleScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    const { sessions } = usePlan();
    const { profile } = useCurrentUser();
    const trainingAnimation = useTrainingAnimation(profile?.sport);
    const { mutate: rescheduleSession } = useRescheduleSession();
    const { mutate: rescheduleAll } = useRescheduleAllSessions();

    // Ausgewählter Ziel-Tag — alles (Tag, Scope, Confirm) in einer Ansicht
    const [pendingDate, setPendingDate] = useState<string | null>(null);
    const [scope, setScope] = useState<'single' | 'all'>('single');

    const weekDays = getWeekDays(new Date());

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

    function handleSelectDay(dateStr: string) {
        setPendingDate(dateStr);
    }

    function handleConfirm() {
        if (!pendingDate) return;
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;
        if (scope === 'all') {
            rescheduleAll(
                { originalScheduledAt: session.scheduled_at!, newDate: pendingDate },
                { onSuccess: () => useToastStore.getState().show(t('ui.sessions_rescheduled_all', { day: originalDayName })) },
            );
        } else {
            rescheduleSession(
                { sessionId, newDate: pendingDate, originalScheduledAt: session.scheduled_at! },
                { onSuccess: () => useToastStore.getState().show(t('ui.session_rescheduled')) },
            );
        }
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const todayStr = toDateStr(new Date());

    const currentSession = sessions.find((s) => s.id === sessionId);
    const currentSessionDateStr = currentSession?.scheduled_at
        ? currentSession.scheduled_at.split('T')[0]
        : null;

    // Mehrere Sessions pro Tag sind erlaubt — belegte Tage werden nicht mehr
    // gesperrt, sondern zeigen Chips mit den dort geplanten Sessions
    // (inklusive der Session, die gerade verschoben wird, auf ihrem Tag)
    const sessionsByDate = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
        if (s.status !== 'scheduled' || !s.scheduled_at) continue;
        const dateStr = s.scheduled_at.split('T')[0];
        const list = sessionsByDate.get(dateStr);
        if (list) list.push(s);
        else sessionsByDate.set(dateStr, [s]);
    }

    const hasSelectableDays = weekDays.some((day) => {
        const dateStr = toDateStr(day);
        return dateStr >= todayStr && dateStr !== currentSessionDateStr;
    });

    // Day name for the "all X sessions" scope label
    const originalDow = currentSession?.scheduled_at
        ? new Date(currentSession.scheduled_at.split('T')[0]).getDay()
        : null;
    const originalDayName = originalDow !== null ? t(dowToDayKey(originalDow) as any) : '';

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: windowHeight * 0.85 }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                <>
                                    <View style={styles.header}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_reschedule_title')}
                                        </JempText>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    {hasSelectableDays ? (
                                        <ScrollView
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.dayList}
                                            style={styles.dayListScroll}
                                        >
                                            {weekDays.map((day, index) => {
                                                const dateStr = toDateStr(day);
                                                const isPast = dateStr < todayStr;
                                                const isCurrentDay = dateStr === currentSessionDateStr;
                                                const isToday = dateStr === todayStr;
                                                const isSelected = dateStr === pendingDate;
                                                const isDisabled = isPast || isCurrentDay;
                                                const daySessions = sessionsByDate.get(dateStr) ?? [];
                                                const dayVariant = getDayVariant(day, profile?.weekly_schedule, profile?.sport?.slug);
                                                const dayName = t(DAY_KEYS[index] as any).toUpperCase();
                                                return (
                                                    <TouchableOpacity
                                                        key={dateStr}
                                                        disabled={isDisabled}
                                                        onPress={() => handleSelectDay(dateStr)}
                                                        activeOpacity={0.7}
                                                        style={[
                                                            styles.dayRow,
                                                            {
                                                                // Ausgewählter Ziel-Tag im Aktiv-Stil der Scope-Rows
                                                                // (GradientMid-Border + Tint), Vergangenheit + aktueller
                                                                // Tag der Session gedimmt, heute nur übers "Heute"-Label
                                                                backgroundColor: isSelected ? `${GradientMid}18` : 'transparent',
                                                                borderColor: isSelected ? GradientMid : theme.borderDivider,
                                                                opacity: isPast || isCurrentDay ? 0.35 : 1,
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.dayLeft}>
                                                            <JempText type="body-l" color={isSelected ? GradientMid : theme.text} style={styles.dayName}>
                                                                {dayName}
                                                            </JempText>
                                                            <JempText type="body-l" color={isSelected ? GradientMid : theme.text}>
                                                                {day.getDate()}
                                                            </JempText>
                                                            {isToday && (
                                                                <JempText type="caption" color={GradientMid}>
                                                                    {t('ui.today')}
                                                                </JempText>
                                                            )}
                                                        </View>

                                                        <View style={styles.dayChips}>
                                                            {dayVariant !== 'rest' && (
                                                                <View style={[styles.dayChip, styles.dayChipIconOnly, { backgroundColor: 'transparent' }]}>
                                                                    {dayVariant === 'training' && (
                                                                        <LottieView
                                                                            source={trainingAnimation as never}
                                                                            autoPlay
                                                                            loop
                                                                            style={styles.dayChipLottie}
                                                                        />
                                                                    )}
                                                                    {dayVariant === 'game' && <GameIcon width={14} height={14} />}
                                                                    {dayVariant === 'fight' && (
                                                                        <LottieView
                                                                            source={require('@/assets/animations/fight.json')}
                                                                            autoPlay
                                                                            loop
                                                                            style={styles.dayChipLottie}
                                                                        />
                                                                    )}
                                                                    {(dayVariant === 'tournament' || dayVariant === 'competition') && (
                                                                        <LottieView
                                                                            source={require('@/assets/animations/throphy.json')}
                                                                            autoPlay
                                                                            loop
                                                                            style={styles.dayChipLottie}
                                                                        />
                                                                    )}
                                                                </View>
                                                            )}
                                                            {/* JEMP-Sessions: Fokus-Kategorien als Icons (Logo als Fallback) */}
                                                            {daySessions.length > 3 ? (
                                                                <View style={[styles.dayChip, { backgroundColor: theme.background }]}>
                                                                    <Logo width={14} height={14} />
                                                                    <JempText type="caption" color={theme.textMuted}>
                                                                        {daySessions.length}
                                                                    </JempText>
                                                                </View>
                                                            ) : (
                                                                daySessions.map((s) => {
                                                                    const categories = (s.focus_categories ?? []).filter((slug) => CATEGORY_SVG_ICONS[slug]);
                                                                    return (
                                                                        <View key={s.id} style={[styles.dayChip, styles.dayChipIconOnly, { backgroundColor: 'transparent' }]}>
                                                                            {categories.length > 0 ? (
                                                                                categories.map((slug) => {
                                                                                    const Icon = CATEGORY_SVG_ICONS[slug];
                                                                                    return <Icon key={slug} width={13} height={13} color={theme.textMuted} />;
                                                                                })
                                                                            ) : (
                                                                                <Logo width={14} height={14} />
                                                                            )}
                                                                        </View>
                                                                    );
                                                                })
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <JempText type="body-l" color={theme.textMuted} style={styles.emptyText}>
                                                {t('ui.session_reschedule_no_free_days')}
                                            </JempText>
                                        </View>
                                    )}

                                    {hasSelectableDays && (
                                        <>
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
                                                                    ? t('ui.session_reschedule_scope_single')
                                                                    : t('ui.session_reschedule_scope_all', { day: originalDayName })}
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

                                            <Pressable
                                                style={[styles.confirmBtn, { opacity: pendingDate ? 1 : 0.4 }]}
                                                disabled={!pendingDate}
                                                onPress={handleConfirm}
                                            >
                                                <JempText type="button" color="#fff">{t('ui.confirm')}</JempText>
                                            </Pressable>
                                        </>
                                    )}
                                </>
                        </View>
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
    dayList: {
        gap: 8,
        paddingBottom: 4,
    },
    dayListScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dayChips: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
    },
    dayChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 100,
    },
    dayChipIconOnly: {
        paddingHorizontal: 6,
    },
    dayChipLottie: {
        // Lottie-Icons haben eingebautes Padding — größer rendern und vertikal
        // kompensieren, damit der Chip nicht höher wird als die Session-Chips
        width: 22,
        height: 22,
        marginVertical: -5,
    },
    dayName: {
        fontWeight: '600',
        minWidth: 36,
    },
    emptyState: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
    },
});
