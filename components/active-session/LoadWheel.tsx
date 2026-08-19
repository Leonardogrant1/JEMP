import { JempText } from '@/components/jemp-text';
import { NumberWheel } from '@/components/ui/number-wheel';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const FRACTIONS_STEP = 0.25;
const FRACTIONS_MAX = 0.75;

/**
 * Gewichts-Eingabe als zwei Räder (wie der Assessment-Timer): ganze kg in
 * 1er-Schritten + Nachkomma in 0,25er-Schritten — beliebige Gewichte ohne
 * endloses Scrollen. Sync-Verhalten wie SetWheel: extern geänderte Werte
 * (Prefill) positionieren die Räder neu, eigene Emissionen nicht.
 */
export function LoadWheel({ label, value, fallback, onChange }: {
    label: string;
    value: string;
    fallback: number;
    onChange: (v: string) => void;
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const parsed = parseFloat(value.replace(',', '.'));
    const numeric = Number.isFinite(parsed) ? parsed : fallback;
    const intVal = Math.floor(numeric);
    const fracVal = Math.min(FRACTIONS_MAX, Math.max(0, Math.round((numeric - intVal) / FRACTIONS_STEP) * FRACTIONS_STEP));

    const intRef = useRef(intVal);
    const fracRef = useRef(fracVal);
    const lastEmitted = useRef<number>(numeric);
    const [epoch, setEpoch] = useState(0);

    useEffect(() => {
        if (value.trim() === '') {
            // Prefill auf den Zielwert, damit ohne Scrollen geloggt werden kann
            lastEmitted.current = numeric;
            intRef.current = intVal;
            fracRef.current = fracVal;
            onChange(String(numeric));
            return;
        }
        if (numeric !== lastEmitted.current) {
            // Externe Änderung (Progression-Prefill / Satzwechsel) → neu positionieren
            lastEmitted.current = numeric;
            intRef.current = intVal;
            fracRef.current = fracVal;
            setEpoch(e => e + 1);
        }
    }, [value, numeric, intVal, fracVal, onChange]);

    const emit = () => {
        const total = intRef.current + fracRef.current;
        lastEmitted.current = total;
        onChange(String(total));
    };

    return (
        <View style={styles.col}>
            <JempText type="caption" color={theme.textMuted} style={styles.label}>
                {label.toUpperCase()}
            </JempText>
            <View style={styles.wheels}>
                <View style={styles.intWheel}>
                    <NumberWheel
                        key={`int-${epoch}`}
                        initialValue={intVal}
                        min={0}
                        max={Math.max(intVal + 20, 30)}
                        visibleItems={3}
                        onChange={(v) => {
                            intRef.current = v;
                            emit();
                        }}
                    />
                </View>
                <View style={styles.fracWheel}>
                    <NumberWheel
                        key={`frac-${epoch}`}
                        initialValue={fracVal}
                        min={0}
                        max={FRACTIONS_MAX}
                        step={FRACTIONS_STEP}
                        extendable={false}
                        visibleItems={3}
                        onChange={(v) => {
                            fracRef.current = v;
                            emit();
                        }}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    col: {
        flex: 1.6,
        gap: 6,
        alignItems: 'center',
    },
    label: {
        letterSpacing: 1,
    },
    wheels: {
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'stretch',
    },
    intWheel: {
        flex: 1.2,
    },
    fracWheel: {
        flex: 1,
    },
});
