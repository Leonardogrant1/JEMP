import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
    label: string;
    description?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onPress: () => void;
}

export function SelectableRow({ label, description, icon, selected, onPress }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.card,
                { backgroundColor: theme.surface },
                selected
                    ? { borderWidth: 1, borderColor: GradientMid }
                    : { borderWidth: 1, borderColor: 'transparent' },
            ]}
        >
            {icon && (
                <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                    <Ionicons name={icon} size={22} color={selected ? theme.text : theme.textMuted} />
                </View>
            )}
            <View style={styles.text}>
                <JempText type="body-l" color={selected ? '#fff' : theme.text}>{label}</JempText>
                {description ? (
                    <JempText type="caption" color={theme.textMuted}>{description}</JempText>
                ) : null}
            </View>
            {selected
                ? <Ionicons name="checkmark-circle" size={20} color={theme.text} />
                : <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
            }
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: { flex: 1, gap: 2 },
    emptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },
});
