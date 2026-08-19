import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { NumberWheel } from '@/components/ui/number-wheel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * NumberWheel-Spalte, die an einen String-Store-Wert gebunden ist. Das Wheel
 * ist unkontrolliert — bei externen Änderungen (Prefill aus Progression /
 * Satzwechsel) remountet es an die neue Position, eigene Emissionen lösen
 * keinen Remount aus. Leerer Store-Wert wird sofort mit dem Fallback (Ziel)
 * befüllt, damit der Log-Button direkt scharf ist.
 */
export function SetWheel({ label, value, fallback, min = 0, step = 1, onChange }: {
    label: string;
    value: string;
    fallback: number;
    min?: number;
    step?: number;
    onChange: (v: string) => void;
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const parsed = parseFloat(value.replace(',', '.'));
    const numeric = Number.isFinite(parsed) ? parsed : fallback;

    const lastEmitted = useRef<number>(numeric);
    const [epoch, setEpoch] = useState(0);

    useEffect(() => {
        if (value.trim() === '') {
            // Prefill auf den Zielwert, damit ohne Scrollen geloggt werden kann
            lastEmitted.current = numeric;
            onChange(String(numeric));
            return;
        }
        if (numeric !== lastEmitted.current) {
            // Externe Änderung (Progression-Prefill / Satzwechsel) → neu positionieren
            lastEmitted.current = numeric;
            setEpoch(e => e + 1);
        }
    }, [value, numeric, onChange]);

    return (
        <View style={styles.col}>
            <JempText type="caption" color={theme.textMuted} style={styles.label}>
                {label.toUpperCase()}
            </JempText>
            <NumberWheel
                key={epoch}
                initialValue={numeric}
                min={min}
                max={Math.max(numeric + 20 * step, min + 30 * step)}
                step={step}
                visibleItems={3}
                onChange={(v) => {
                    lastEmitted.current = v;
                    onChange(String(v));
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    col: {
        flex: 1,
        gap: 6,
        alignItems: 'center',
    },
    label: {
        letterSpacing: 1,
    },
});
