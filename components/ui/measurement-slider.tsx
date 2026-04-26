import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { formatHeight, kgToLbs } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, View } from 'react-native';

// ── Weight ────────────────────────────────────────────────────────────────────

interface WeightSliderProps {
    valueKg: number;
    onChange: (kg: number) => void;
    unit: 'kg' | 'lbs';
    onToggleUnit: () => void;
}

export function WeightSlider({ valueKg, onChange, unit, onToggleUnit }: WeightSliderProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const displayValue = unit === 'kg' ? valueKg : kgToLbs(valueKg);
    const minKg = 30;
    const maxKg = 250;

    return (
        <View style={styles.row}>
            <View style={styles.labelRow}>
                <Pressable onPress={onToggleUnit} style={styles.labelBtn} hitSlop={8}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        WEIGHT ({unit.toUpperCase()})
                    </JempText>
                    <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
                </Pressable>
                <JempText type="h1" color={theme.text}>{displayValue}</JempText>
            </View>
            <Slider
                style={styles.slider}
                minimumValue={minKg}
                maximumValue={maxKg}
                step={1}
                value={valueKg}
                onValueChange={onChange}
                minimumTrackTintColor={GradientMid}
                maximumTrackTintColor={theme.borderStrong}
                thumbTintColor={theme.text}
            />
        </View>
    );
}

// ── Height ────────────────────────────────────────────────────────────────────

interface HeightSliderProps {
    valueCm: number;
    onChange: (cm: number) => void;
    unit: 'cm' | 'ft';
    onToggleUnit: () => void;
}

export function HeightSlider({ valueCm, onChange, unit, onToggleUnit }: HeightSliderProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const displayValue = formatHeight(valueCm, unit);
    const minCm = 120;
    const maxCm = 230;

    return (
        <View style={styles.row}>
            <View style={styles.labelRow}>
                <Pressable onPress={onToggleUnit} style={styles.labelBtn} hitSlop={8}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        HEIGHT ({unit.toUpperCase()})
                    </JempText>
                    <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
                </Pressable>
                <JempText type="h1" color={theme.text}>{displayValue}</JempText>
            </View>
            <Slider
                style={styles.slider}
                minimumValue={minCm}
                maximumValue={maxCm}
                step={1}
                value={valueCm}
                onValueChange={onChange}
                minimumTrackTintColor={GradientMid}
                maximumTrackTintColor={theme.borderStrong}
                thumbTintColor={theme.text}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: {
        gap: 4,
        paddingVertical: 24,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    label: {
        letterSpacing: 1,
        fontSize: 11,
    },
    slider: {
        width: '100%',
        height: 40,
        marginHorizontal: -8,
    },
});
