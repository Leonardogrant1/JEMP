import { JempText } from '@/components/jemp-text';
import { Colors, Cyan } from '@/constants/theme';
import { DAY_KEYS, dowToDayKey, getWeekDays, toDateStr } from '@/helpers/date-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRescheduleAllSessions } from '@/mutations/use-reschedule-all-sessions';
import { useRescheduleSession } from '@/mutations/use-reschedule-session';
import { usePlan } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    const { sessions } = usePlan();
    const { mutate: rescheduleSession } = useRescheduleSession();
    const { mutate: rescheduleAll } = useRescheduleAllSessions();

    // null = day picker, string = confirmation step
    const [pendingDate, setPendingDate] = useState<string | null>(null);
    const [scope, setScope] = useState<'single' | 'all'>('single');

    const weekDays = getWeekDays(new Date());

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

    function handleSelectDay(dateStr: string) {
        setScope('single');
        setPendingDate(dateStr);
    }

    function handleConfirm() {
        if (!pendingDate) return;
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;
        if (scope === 'all') {
            rescheduleAll({ originalScheduledAt: session.scheduled_at!, newDate: pendingDate });
        } else {
            rescheduleSession({ sessionId, newDate: pendingDate, originalScheduledAt: session.scheduled_at! });
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

    const occupiedDates = new Set<string>(
        sessions
            .filter((s) => s.status === 'scheduled' && s.id !== sessionId)
            .map((s) => s.scheduled_at!.split('T')[0])
    );

    const hasFreeDays = weekDays.some((day) => {
        const dateStr = toDateStr(day);
        return dateStr >= todayStr && dateStr !== currentSessionDateStr && !occupiedDates.has(dateStr);
    });

    // Day names for confirmation step
    const originalDow = currentSession?.scheduled_at
        ? new Date(currentSession.scheduled_at.split('T')[0]).getDay()
        : null;
    const pendingDow = pendingDate ? new Date(pendingDate).getDay() : null;
    const originalDayName = originalDow !== null ? t(dowToDayKey(originalDow) as any) : '';
    const pendingDayName = pendingDow !== null ? t(dowToDayKey(pendingDow) as any) : '';

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            {pendingDate ? (
                                // ── Confirmation step ─────────────────────────────
                                <>
                                    <View style={styles.header}>
                                        <TouchableOpacity onPress={() => setPendingDate(null)} hitSlop={8}>
                                            <Ionicons name="arrow-back" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.textBlock}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_reschedule_scope_title')}
                                        </JempText>
                                        <JempText type="body-l" color={theme.textMuted}>
                                            {t('ui.session_reschedule_scope_body', { from: originalDayName, to: pendingDayName })}
                                        </JempText>
                                    </View>

                                    <View style={styles.scopeOptions}>
                                        {(['single', 'all'] as const).map((option) => {
                                            const active = scope === option;
                                            return (
                                                <Pressable
                                                    key={option}
                                                    style={[
                                                        styles.scopeRow,
                                                        {
                                                            backgroundColor: active ? `${Cyan[500]}18` : theme.surface,
                                                            borderColor: active ? Cyan[500] : theme.borderCard,
                                                        },
                                                    ]}
                                                    onPress={() => setScope(option)}
                                                >
                                                    <Ionicons
                                                        name={option === 'single' ? 'calendar-outline' : 'repeat-outline'}
                                                        size={20}
                                                        color={active ? Cyan[400] : theme.textMuted}
                                                    />
                                                    <JempText type="body-l" color={active ? Cyan[400] : theme.text} style={{ flex: 1 }}>
                                                        {option === 'single'
                                                            ? t('ui.session_reschedule_scope_single')
                                                            : t('ui.session_reschedule_scope_all', { day: originalDayName })}
                                                    </JempText>
                                                    <View style={[
                                                        styles.radio,
                                                        { borderColor: active ? Cyan[500] : theme.borderCard },
                                                    ]}>
                                                        {active && <View style={[styles.radioDot, { backgroundColor: Cyan[500] }]} />}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                                        <JempText type="button" color="#fff">{t('ui.confirm')}</JempText>
                                    </Pressable>
                                </>
                            ) : (
                                // ── Day picker ────────────────────────────────────
                                <>
                                    <View style={styles.header}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_reschedule_title')}
                                        </JempText>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    {hasFreeDays ? (
                                        <ScrollView
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.dayList}
                                        >
                                            {weekDays.map((day, index) => {
                                                const dateStr = toDateStr(day);
                                                const isPast = dateStr < todayStr;
                                                const isCurrentDay = dateStr === currentSessionDateStr;
                                                const isOccupied = occupiedDates.has(dateStr);
                                                const isDisabled = isPast || isCurrentDay || isOccupied;
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
                                                                backgroundColor: 'transparent',
                                                                borderColor: theme.borderDivider,
                                                                opacity: isDisabled ? 0.35 : 1,
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.dayLeft}>
                                                            <JempText type="body-l" color={theme.text} style={styles.dayName}>
                                                                {dayName}
                                                            </JempText>
                                                            <JempText type="body-l" color={theme.text}>
                                                                {day.getDate()}
                                                            </JempText>
                                                        </View>

                                                        {isOccupied && !isCurrentDay && (
                                                            <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                                                        )}
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
                                </>
                            )}
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
    textBlock: {
        gap: 6,
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
        backgroundColor: Cyan[500],
    },
    dayList: {
        gap: 8,
        paddingBottom: 4,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
