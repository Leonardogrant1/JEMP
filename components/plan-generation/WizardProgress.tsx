import { PHASES } from "@/constants/plan-generation-constants";
import { Colors, GRADIENT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Phase } from "@/types/plan-generation";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Reanimated, { Easing, LinearTransition } from "react-native-reanimated";

const fillTransition = LinearTransition.duration(320).easing(Easing.out(Easing.cubic));

/** Thin full-width progress line under the wizard header — gradient fill per phase. */
export function WizardProgress({ phase }: { phase: Phase }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const idx = PHASES.indexOf(phase);
    const pct = ((idx + 1) / PHASES.length) * 100;

    return (
        <View style={[styles.track, { backgroundColor: theme.borderDivider }]}>
            <Reanimated.View layout={fillTransition} style={[styles.fill, { width: `${pct}%` }]}>
                <LinearGradient
                    colors={GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Reanimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: 3,
        width: '100%',
    },
    fill: {
        height: 3,
        overflow: 'hidden',
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
});
