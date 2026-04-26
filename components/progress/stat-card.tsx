import { CATEGORY_ICONS, STAT_LABELS } from "@/constants/progress-constants";
import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { TrendBadge } from "./trend-badge";

interface StatCardProps {
    slug: string;
    value: number | undefined;
    trend: number | null;
}

export function StatCard({ slug, value, trend }: StatCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const icon = CATEGORY_ICONS[slug] ?? 'fitness';
    const label = STAT_LABELS[slug] ?? slug;
    const hasValue = value !== undefined;

    return (
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={styles.statCardHeader}>
                <View style={styles.statHeader}>
                    <Ionicons name={icon} size={13} color={theme.textMuted} />
                    <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>
                        {label}
                    </JempText>
                </View>
                {trend !== null && <TrendBadge trend={trend} />}
            </View>
            <JempText type="h1" color={hasValue ? theme.textHeadline : theme.textMuted} style={styles.statValue}>
                {hasValue ? String(value) : '—'}
            </JempText>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderDivider }]}>
                {hasValue && (
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${value}%` }]}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statsSection: { gap: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48.25%',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 0,
        gap: 6,
        overflow: 'hidden',
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statLabel: { fontSize: 11, letterSpacing: 0.3 },
    statValue: { fontSize: 32, lineHeight: 38, letterSpacing: -1, paddingBottom: 10 },
    progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
});