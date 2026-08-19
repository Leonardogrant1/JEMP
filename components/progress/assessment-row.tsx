import { Colors, Cyan } from "@/constants/theme";
import { displayMetricValue } from "@/helpers/units";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { CategoryAssessmentEntry } from "@/queries/use-category-assessments-query";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { Sparkline } from "./sparkline";


interface AssessmentRowProps {
    entry: CategoryAssessmentEntry;
    categorySlug?: string;
    index?: number; // position in the list, used to stagger the sparkline reveal
    bounded?: boolean; // false for free-scale value series (kg, reps) instead of 0–100 scores
}

export function AssessmentRow({ entry, index = 0, bounded }: AssessmentRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const unitSystem = useUnitSystem();

    const latestDisplay = displayMetricValue(entry.latestValue, entry.unit, unitSystem);
    const firstDisplay = entry.firstValue !== null
        ? displayMetricValue(entry.firstValue, entry.unit, unitSystem)
        : null;

    const changeColor =
        entry.percentChange === null ? theme.textMuted
            : entry.percentChange > 0 ? Cyan[400]
                : entry.percentChange < 0 ? '#ef4444'
                    : theme.textMuted;

    const changeLabel =
        entry.percentChange === null ? null
            : entry.percentChange > 0 ? `+${entry.percentChange}%`
                : entry.percentChange < 0 ? `${entry.percentChange}%`
                    : '0%';

    return (
        <View style={[styles.assessCard, { backgroundColor: theme.surface }]}>
            <View style={styles.assessRow}>
                <View style={styles.assessLeft}>
                    <JempText type="body-l" color={theme.text} numberOfLines={1} style={styles.assessName}>
                        {entry.name}
                    </JempText>
                    {/* Start → End values, or just latest if only one entry */}
                    <JempText type="caption" color={theme.textMuted}>
                        {firstDisplay
                            ? `${firstDisplay.value.toLocaleString()} → ${latestDisplay.value.toLocaleString()} ${latestDisplay.unit}`
                            : `${latestDisplay.value.toLocaleString()} ${latestDisplay.unit}`}
                    </JempText>
                </View>
                <View style={styles.assessRight}>
                    {entry.latestScore !== null && (
                        <JempText type="h2" style={styles.scoreValue}>
                            {entry.latestScore}
                        </JempText>
                    )}
                    {changeLabel !== null && (
                        <JempText type="caption" color={changeColor} style={styles.deltaText}>
                            {changeLabel}
                        </JempText>
                    )}
                </View>
            </View>
            <Sparkline
                data={entry.history}
                height={32}
                negative={entry.percentChange !== null && entry.percentChange < 0}
                delay={index * 80}
                bounded={bounded}
            />
        </View>
    );
}



const styles = StyleSheet.create({
    assessCard: {
        borderRadius: 14,
        paddingBottom: 4,
        overflow: 'hidden',
    },
    assessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 8,
    },
    assessLeft: { flex: 1, gap: 2 },
    assessName: { fontSize: 15 },
    assessRight: { alignItems: 'flex-end', gap: 1 },
    scoreValue: { fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
    scorePill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    scoreText: { fontWeight: '600', fontSize: 13 },
    deltaText: { fontWeight: '500', fontSize: 12 },
    assessEmpty: { paddingVertical: 20, alignItems: 'center' }
});