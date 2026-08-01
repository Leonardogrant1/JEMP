import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";


interface SettingsRowProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    loading?: boolean;
    destructive?: boolean;
    rightElement?: React.ReactNode;
}


export function SettingsRow({ icon, label, onPress, loading, destructive, rightElement }: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && { opacity: 0.6 }]}
            onPress={onPress}
            disabled={loading}
        >
            <View style={styles.iconWrap}>
                {loading
                    ? <ActivityIndicator size="small" color={destructive ? '#ef4444' : theme.textMuted} />
                    : icon
                }
            </View>
            <JempText type="body-l" color={destructive ? '#ef4444' : theme.text} style={styles.settingsLabel}>{label}</JempText>
            {rightElement ?? <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    iconWrap: {
        width: 24,
        alignItems: 'center',
    },
    settingsLabel: {
        flex: 1,
    },
});
