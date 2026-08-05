import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
    label: string;
    description?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    /** 'lg' für Steps mit wenigen, prominenten Optionen (z. B. Trainingsorte) */
    size?: 'md' | 'lg';
    onPress: () => void;
}

export function SelectableRow({ label, description, icon, selected, size = 'md', onPress }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const lg = size === 'lg';

    return (
        <TouchableOpacity
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            activeOpacity={0.7}
            style={[
                styles.card,
                lg && styles.cardLg,
                selected
                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                    : { backgroundColor: theme.surface, borderColor: 'transparent' },
            ]}
        >
            {icon && (
                <View style={[styles.iconBox, lg && styles.iconBoxLg, { backgroundColor: selected ? `${GradientMid}18` : theme.background }]}>
                    <Ionicons name={icon} size={lg ? 24 : 22} color={selected ? GradientMid : theme.textMuted} />
                </View>
            )}
            <View style={styles.text}>
                <JempText type="body-l" color={theme.text}>{label}</JempText>
                {description ? (
                    <JempText type="caption" color={theme.textMuted}>{description}</JempText>
                ) : null}
            </View>
            {selected
                ? <Ionicons name="checkmark-circle" size={20} color={GradientMid} />
                : <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
            }
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cardLg: {
        paddingVertical: 22,
        paddingHorizontal: 18,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxLg: {
        width: 52,
        height: 52,
        borderRadius: 14,
    },
    text: { flex: 1, gap: 2 },
    emptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },
});
