import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const COOPER_SECONDS = 12 * 60;

/** 12-Minuten-Countdown für den Cooper-Test — alles in der App, nur die
 *  Distanz kommt von Lauf-App/Bahn (GPS-Tracking = Post-v1-Backlog). */
export function CooperCountdown() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const [remaining, setRemaining] = useState(COOPER_SECONDS);
    const [running, setRunning] = useState(false);
    const interval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!running) return;
        interval.current = setInterval(() => {
            setRemaining((r) => {
                if (r <= 1) {
                    setRunning(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
        return () => { if (interval.current) clearInterval(interval.current); };
    }, [running]);

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    const done = remaining === 0;

    return (
        <View style={[styles.box, { backgroundColor: theme.surface }]}>
            <JempText type="hero" color={done ? GradientMid : theme.text}>{`${mm}:${ss}`}</JempText>
            <View style={styles.row}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRunning((r) => !r); }}
                    style={[styles.btn, { borderColor: GradientMid }]}
                    disabled={done}
                >
                    <JempText type="button" color={GradientMid}>
                        {running ? t('ui.pause') : t('ui.start')}
                    </JempText>
                </Pressable>
                <Pressable
                    onPress={() => { setRunning(false); setRemaining(COOPER_SECONDS); }}
                    style={[styles.btn, { borderColor: theme.borderStrong }]}
                >
                    <JempText type="button" color={theme.textMuted}>{t('ui.reset')}</JempText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    box: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 14, marginBottom: 16 },
    row: { flexDirection: 'row', gap: 10 },
    btn: { borderWidth: 1.5, borderRadius: 100, paddingVertical: 8, paddingHorizontal: 22 },
});
