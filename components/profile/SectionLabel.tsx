import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StyleSheet } from "react-native";
import { JempText } from "../jemp-text";

export function SectionLabel({ label }: { label: string }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    return (
        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
            {label.toUpperCase()}
        </JempText>
    );
}

const styles = StyleSheet.create({
    sectionLabel: { letterSpacing: 1, fontSize: 11, paddingHorizontal: 4 },

});
