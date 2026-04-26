import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export function SelectableChip({ label, selected, onPress }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.chip,
                { backgroundColor: theme.surface },
                selected && { borderWidth: 1, borderColor: GradientMid },
            ]}
        >
            <JempText type="caption" color={selected ? '#fff' : theme.textMuted} style={styles.chipText}>
                {label}
            </JempText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
    chipText: { fontSize: 14, fontWeight: '500' },
});
