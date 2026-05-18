import { JempText } from '@/components/jemp-text';
import { Colors, Cyan } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { WorkoutSession } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAY_KEYS = [
    'onboarding.workout_prefs_day_mon',
    'onboarding.workout_prefs_day_tue',
    'onboarding.workout_prefs_day_wed',
    'onboarding.workout_prefs_day_thu',
    'onboarding.workout_prefs_day_fri',
    'onboarding.workout_prefs_day_sat',
    'onboarding.workout_prefs_day_sun',
] as const;

interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: (newDate: string) => void;
    sessions: WorkoutSession[];
    currentSessionId: string;
    weekDays: Date[];
}

function toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function SessionRescheduleModal({
    visible,
    onClose,
    onConfirm,
    sessions,
    currentSessionId,
    weekDays,
}: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            overlayValue.value = withTiming(1, { duration: 250 });
            slideValue.value = withTiming(0, { duration: 300 });
            setSelectedDate(null);
        } else {
            overlayValue.value = withTiming(0, { duration: 200 });
            slideValue.value = withTiming(600, { duration: 200 });
        }
    }, [visible]);

    function handleClose() {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) runOnJS(onClose)();
        });
    }

    function handleSelectDay(dateStr: string) {
        setSelectedDate(dateStr);
        runOnJS(onConfirm)(dateStr);
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const todayStr = toDateStr(new Date());

    // Find the current session to get its scheduled date
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const currentSessionDateStr = currentSession?.scheduled_at
        ? currentSession.scheduled_at.split('T')[0]
        : null;

    // Build a set of occupied dates (scheduled sessions excluding the current one)
    const occupiedDates = new Set<string>(
        sessions
            .filter((s) => s.status === 'scheduled' && s.id !== currentSessionId)
            .map((s) => s.scheduled_at!.split('T')[0])
    );

    const hasFreeDays = weekDays.some((day) => {
        const dateStr = toDateStr(day);
        const isPast = dateStr < todayStr;
        const isCurrentDay = dateStr === currentSessionDateStr;
        const isOccupied = occupiedDates.has(dateStr);
        return !isPast && !isCurrentDay && !isOccupied;
    });

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={styles.backdropPressable} onPress={handleClose}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Reanimated.View
                            style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                        >
                            <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                {/* Header */}
                                <View style={styles.header}>
                                    <JempText type="h2" color={theme.text}>
                                        {t('ui.session_reschedule_title')}
                                    </JempText>
                                    <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {/* Day list */}
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
                                            const isSelected = selectedDate === dateStr;

                                            const rowBg = isSelected
                                                ? `${Cyan[500]}18`
                                                : 'transparent';
                                            const rowBorder = isSelected
                                                ? Cyan[500]
                                                : theme.borderDivider;
                                            const textColor = isDisabled ? theme.textMuted : theme.text;
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
                                                            backgroundColor: rowBg,
                                                            borderColor: rowBorder,
                                                            opacity: isDisabled ? 0.35 : 1,
                                                        },
                                                    ]}
                                                >
                                                    {/* Left: day name + date number */}
                                                    <View style={styles.dayLeft}>
                                                        <JempText type="body-l" color={textColor} style={styles.dayName}>
                                                            {dayName}
                                                        </JempText>
                                                        <JempText type="body-l" color={textColor}>
                                                            {day.getDate()}
                                                        </JempText>
                                                    </View>

                                                    {/* Right: lock or checkmark */}
                                                    {isOccupied && !isCurrentDay && (
                                                        <Ionicons
                                                            name="lock-closed-outline"
                                                            size={18}
                                                            color={theme.textMuted}
                                                        />
                                                    )}
                                                    {isSelected && (
                                                        <Ionicons
                                                            name="checkmark-circle"
                                                            size={20}
                                                            color={Cyan[500]}
                                                        />
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
                            </View>
                        </Reanimated.View>
                    </Pressable>
                </Pressable>
            </Reanimated.View>
        </Modal>
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
