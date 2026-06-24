import { PHASES } from "@/constants/plan-generation-constants";
import { Colors, GradientMid } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Phase } from "@/types/plan-generation";
import { StyleSheet, View } from "react-native";

export function StepBars({ phase }: { phase: Phase }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const idx = PHASES.indexOf(phase);

    return (
        <View style={styles.stepBars}>
            {PHASES.map((_, i) =>
                i <= idx ? (
                    <View key={i} style={[styles.stepBar, { backgroundColor: GradientMid }]} />
                ) : (
                    <View key={i} style={[styles.stepBar, { backgroundColor: theme.borderStrong }]} />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    stepBars: { flexDirection: 'row', gap: 5 },
    stepBar: { width: 24, height: 3, borderRadius: 2 },
})

