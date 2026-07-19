import { DAY_NAMES } from "@/constants/date-constants";
import { Colors, Cyan, Electric } from "@/constants/theme";
import { toDateStr } from "@/helpers/date-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

interface WeekStripProps {
    weekDays: Date[];
    todayIndex: number;
    selectedDay: Date;
    setSelectedDay: (date: Date) => void;
    weekSessionDays: Set<string>;
}

export function WeekStrip({
    weekDays,
    todayIndex,
    selectedDay,
    setSelectedDay,
    weekSessionDays,
}: WeekStripProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const selectedDayStr = toDateStr(selectedDay);

    return (
        <View style={styles.weekStrip}>
            {weekDays.map((day, i) => {
                const isToday = i === todayIndex;
                const isSelected = toDateStr(day) === selectedDayStr;
                const hasSession = weekSessionDays.has(toDateStr(day));

                return (
                    <Pressable
                        key={i}
                        style={[
                            styles.dayWrapper,
                            {
                                backgroundColor: isSelected
                                    ? 'transparent'
                                    : isToday
                                        ? `${Electric[500]}40`
                                        : theme.surface,
                                borderWidth: 1,
                                borderColor: isToday && !isSelected ? Electric[500] : 'transparent',
                            },
                        ]}
                        onPress={() => setSelectedDay(new Date(day))}
                    >
                        {isSelected && (
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        <JempText
                            type="caption"
                            style={styles.dayName}
                            color={isSelected ? 'rgba(255,255,255,0.7)' : theme.textMuted}
                        >
                            {DAY_NAMES[i]}
                        </JempText>
                        <JempText
                            type="h2"
                            style={styles.dayNumber}
                            color={isSelected ? '#fff' : theme.text}
                        >
                            {String(day.getDate())}
                        </JempText>
                        <View style={styles.dotSlot}>
                            {isToday
                                ? <JempText type="caption" style={styles.todayLabel} color={isSelected ? 'rgba(255,255,255,0.7)' : Electric[400]}>{t('ui.today')}</JempText>
                                : hasSession && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : theme.primary }]} />
                            }
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    weekStrip: { flexDirection: 'row', gap: 4 },
    dayWrapper: {
        flex: 1, borderRadius: 10, paddingVertical: 7,
        alignItems: 'center', overflow: 'hidden', gap: 2,
    },
    dayName: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5 },
    dayNumber: { fontSize: 15, lineHeight: 18 },
    todayLabel: { fontSize: 7, lineHeight: 10, letterSpacing: 0.5 },
    dotSlot: { height: 10, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3 },
});
