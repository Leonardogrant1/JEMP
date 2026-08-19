import { DAY_NAMES } from "@/constants/date-constants";
import { Colors, Cyan, Electric, GradientMid } from "@/constants/theme";
import { toDateStr } from "@/helpers/date-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { JempText } from "../jemp-text";

const TILE_GAP = 4;

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

    const [stripWidth, setStripWidth] = useState(0);
    const tileWidth = stripWidth > 0
        ? (stripWidth - TILE_GAP * (weekDays.length - 1)) / weekDays.length
        : 0;
    const selectedIndex = weekDays.findIndex(d => toDateStr(d) === selectedDayStr);

    // A single gradient thumb slides behind the tiles instead of each tile
    // hard-switching its own background
    const thumbX = useSharedValue(0);
    const thumbOpacity = useSharedValue(0);
    useEffect(() => {
        if (tileWidth === 0) return;
        if (selectedIndex < 0) {
            thumbOpacity.value = withTiming(0, { duration: 150 });
            return;
        }
        const x = selectedIndex * (tileWidth + TILE_GAP);
        if (thumbOpacity.value === 0) {
            // First appearance (or coming back from an out-of-week selection): no slide
            thumbX.value = x;
            thumbOpacity.value = withTiming(1, { duration: 150 });
        } else {
            thumbX.value = withTiming(x, { duration: 260, easing: Easing.out(Easing.cubic) });
        }
    }, [selectedIndex, tileWidth, thumbX, thumbOpacity]);

    const thumbStyle = useAnimatedStyle(() => ({
        width: tileWidth,
        opacity: thumbOpacity.value,
        transform: [{ translateX: thumbX.value }],
    }));

    return (
        <View style={styles.weekStrip} onLayout={e => setStripWidth(e.nativeEvent.layout.width)}>
            {/* Background layer: static tile surfaces the thumb can slide OVER —
                inside the tiles it would vanish behind their opaque backgrounds */}
            <View style={styles.bgLayer} pointerEvents="none">
                {weekDays.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bgTile,
                            { backgroundColor: i === todayIndex ? `${GradientMid}40` : theme.surface },
                        ]}
                    />
                ))}
            </View>
            {tileWidth > 0 && (
                <Reanimated.View style={[styles.thumb, thumbStyle]} pointerEvents="none">
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Reanimated.View>
            )}
            {weekDays.map((day, i) => {
                const isToday = i === todayIndex;
                const isSelected = toDateStr(day) === selectedDayStr;
                const hasSession = weekSessionDays.has(toDateStr(day));

                return (
                    <Pressable
                        key={i}
                        style={styles.dayWrapper}
                        onPress={() => {
                            if (!isSelected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedDay(new Date(day));
                        }}
                    >
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
                                ? <JempText type="caption" style={styles.todayLabel} color={isSelected ? 'rgba(255,255,255,0.7)' : GradientMid}>{t('ui.today')}</JempText>
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
    weekStrip: { flexDirection: 'row', gap: TILE_GAP },
    bgLayer: {
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: TILE_GAP,
    },
    bgTile: { flex: 1, borderRadius: 10 },
    thumb: {
        position: 'absolute', top: 0, bottom: 0, left: 0,
        borderRadius: 10, overflow: 'hidden',
    },
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
