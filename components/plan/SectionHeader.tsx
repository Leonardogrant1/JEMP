import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

/** Section header: gradient accent bar + gradient uppercase label, optional muted caption (+icon) right */
export function SectionHeader({ label, caption, captionIcon }: {
    label: string;
    caption?: string;
    captionIcon?: ReactNode;
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.row}>
            <LinearGradient
                colors={[Cyan[500], Electric[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.accentBar}
            />
            <JempText type="button" gradient>{label.toUpperCase()}</JempText>
            {(caption || captionIcon) && (
                <View style={styles.captionWrap}>
                    {captionIcon}
                    {caption && (
                        <JempText type="caption" color={theme.textMuted}>{caption}</JempText>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    accentBar: { width: 3, height: 24, borderRadius: 2 },
    captionWrap: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
});
