import { JempText } from '@/components/jemp-text';
import { TapeMeasure } from '@/components/ui/tape-measure';
import { Colors } from '@/constants/theme';
import { cmToIn, inToCm, kgToLbs, lbsToKg } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

// Tape-based measurement pickers (assessment TapeMeasure look). The unit
// follows the profile's unit system — no local toggles. The tape remounts
// per unit (key) and positions itself once from the converted initial value.

// ── Weight ────────────────────────────────────────────────────────────────────

interface WeightTapeProps {
    valueKg: number;
    onChange: (kg: number) => void;
    unit: 'kg' | 'lbs';
}

export function WeightTape({ valueKg, onChange, unit }: WeightTapeProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.section}>
            <SectionLabel label={t('ui.weight')} />
            {unit === 'kg'
                ? <TapeMeasure
                    key="kg"
                    initialValue={valueKg}
                    min={30}
                    max={250}
                    step={0.5}
                    unitLabel="kg"
                    majorEvery={2}
                    labelEvery={10}
                    readoutPosition="above"
                    onChange={onChange}
                />
                : <TapeMeasure
                    key="lbs"
                    initialValue={kgToLbs(valueKg)}
                    min={60}
                    max={550}
                    step={1}
                    unitLabel="lbs"
                    majorEvery={5}
                    labelEvery={10}
                    readoutPosition="above"
                    onChange={v => onChange(lbsToKg(v))}
                />
            }
        </View>
    );
}

// ── Height ────────────────────────────────────────────────────────────────────

interface HeightTapeProps {
    valueCm: number;
    onChange: (cm: number) => void;
    unit: 'cm' | 'in';
}

export function HeightTape({ valueCm, onChange, unit }: HeightTapeProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.section}>
            <SectionLabel label={t('ui.height')} />
            {unit === 'cm'
                ? <TapeMeasure
                    key="cm"
                    initialValue={valueCm}
                    min={120}
                    max={230}
                    step={1}
                    unitLabel="cm"
                    majorEvery={5}
                    labelEvery={10}
                    readoutPosition="above"
                    onChange={onChange}
                />
                : <TapeMeasure
                    key="in"
                    initialValue={Math.round(cmToIn(valueCm) * 2) / 2}
                    min={47}
                    max={91}
                    step={0.5}
                    unitLabel="in"
                    majorEvery={2}
                    labelEvery={10}
                    readoutPosition="above"
                    onChange={v => onChange(Math.round(inToCm(v)))}
                />
            }
        </View>
    );
}

// ── Shared label ──────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <JempText type="caption" color={theme.textMuted} style={styles.label}>
            {label.toUpperCase()}
        </JempText>
    );
}

const styles = StyleSheet.create({
    section: { alignItems: 'center', gap: 14 },
    label: {
        letterSpacing: 1.5,
        fontSize: 11,
        textAlign: 'center',
    },
});
