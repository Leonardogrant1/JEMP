import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/web/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";


interface SettingsRowProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    loading?: boolean;
    destructive?: boolean;
}


export function SettingsRow({ icon, label, onPress, loading, destructive }: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Pressable
            style={({ pressed }) => [
                styles.settingsRow,
                { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onPress}
            disabled={loading}
        >
            <View style={[styles.settingsIconBox, { backgroundColor: theme.background }, destructive && styles.settingsIconBoxDestructive]}>
                {loading
                    ? <ActivityIndicator size="small" color={destructive ? '#ef4444' : '#fff'} />
                    : icon
                }
            </View>
            <JempText type="body-l" color={destructive ? '#ef4444' : theme.text} style={styles.settingsLabel}>{label}</JempText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 14,
    },
    settingsIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsIconBoxDestructive: {
        backgroundColor: '#ef444418',
    },
    settingsLabel: { flex: 1 },
})