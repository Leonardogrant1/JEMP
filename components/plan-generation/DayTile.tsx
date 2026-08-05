import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

/** Round day toggle for the wizard's weekday pickers */
export function DayTile({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            style={[
                styles.tile,
                selected
                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                    : { backgroundColor: theme.surface, borderColor: 'transparent' },
            ]}
        >
            <JempText type="caption" color={selected ? GradientMid : theme.textMuted} style={styles.label}>
                {label}
            </JempText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontSize: 12, fontWeight: '600' },
});
