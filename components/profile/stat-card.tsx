import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";


// ── Stat card ────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

export function StatCard({ icon, label, value }: StatCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={styles.statCardContent}>

                <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>
                    {label}
                </JempText>
                <JempText type="h2" color={theme.text} style={styles.statValue}>
                    {value}
                </JempText>
            </View>
            {icon}
        </View>
    );
}

const styles = StyleSheet.create({
    statCard: {
        width: '48.25%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: 16,
        padding: 16,
        gap: 4,
    },
    statCardContent: {
        gap: 10,
    },
    statLabel: { letterSpacing: 0.3, fontSize: 11, marginTop: 2 },
    statValue: { fontSize: 26, letterSpacing: -0.5 },
});