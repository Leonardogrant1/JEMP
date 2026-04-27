import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
    label: string;
    selected: boolean;
    onPress: () => void;
    color?: string;
    size?: 'sm' | 'md';
    style?: object;
}

export function SelectableChip({ label, selected, onPress, color, size = 'md', style }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const activeColor = color ?? GradientMid;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.chip,
                size === 'sm' && styles.chipSm,
                { backgroundColor: theme.surface, borderColor: selected ? activeColor : theme.surface },
                style,
            ]}
        >
            <JempText
                type="caption"
                color={selected ? activeColor : theme.textMuted}
                style={size === 'sm' ? styles.chipTextSm : styles.chipText}
            >
                {label}
            </JempText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1 },
    chipSm: { paddingVertical: 7, paddingHorizontal: 12 },
    chipText: { fontSize: 14, fontWeight: '500' },
    chipTextSm: { fontSize: 12, fontWeight: '500' },
});
