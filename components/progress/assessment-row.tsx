import { Colors, Cyan } from "@/constants/theme";
import { gaugeColor } from "@/helpers/progress-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CategoryAssessmentEntry } from "@/queries/use-category-assessments-query";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { MiniGauge } from "./mini-gauge";


interface AssessmentRowProps {
    entry: CategoryAssessmentEntry;
    categorySlug: string;
}

export function AssessmentRow({ entry, categorySlug }: AssessmentRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

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
        <View style={[styles.assessRow, { backgroundColor: theme.surface }]}>
            <View style={styles.assessLeft}>
                <JempText type="body-l" color={theme.text} numberOfLines={1} style={styles.assessName}>
                    {entry.name}
                </JempText>
                {/* Start → End values, or just latest if only one entry */}
                <JempText type="caption" color={theme.textMuted}>
                    {entry.firstValue !== null
                        ? `${entry.firstValue} → ${entry.latestValue} ${entry.unit}`
                        : `${entry.latestValue} ${entry.unit}`}
                </JempText>
            </View>
            <View style={styles.assessRight}>
                {entry.latestScore !== null && (
                    <MiniGauge score={entry.latestScore} color={gaugeColor(entry.latestScore)} />
                )}
                {changeLabel !== null && (
                    <JempText type="caption" color={changeColor} style={styles.deltaText}>
                        {changeLabel}
                    </JempText>
                )}
            </View>
        </View>
    );
}



const styles = StyleSheet.create({
    assessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    assessLeft: { flex: 1, gap: 2 },
    assessName: { fontSize: 15 },
    assessRight: { alignItems: 'flex-end', gap: 4 },
    scorePill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    scoreText: { fontWeight: '600', fontSize: 13 },
    deltaText: { fontWeight: '500', fontSize: 12 },
    assessEmpty: { paddingVertical: 20, alignItems: 'center' }
});