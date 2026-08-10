import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

interface Props {
    /** true = alle Assessments erledigt (Erfolgs-State), false = noch kein Plan */
    allDone: boolean;
}

// Struktur wie die EmptyPlanCard (Lottie → h1 → Subtitle), aber etwas höher
// positioniert und ohne CTA — Assessments entstehen aus dem Plan.
export function EmptyAssessmentsCard({ allDone }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const lottieRef = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
    }, []));

    return (
        <View style={styles.card}>
            {/* „Alles erledigt" ist ein Erfolgs-State → eigene Done-Animation */}
            <LottieView
                ref={lottieRef}
                source={allDone
                    ? require('@/assets/animations/assessments-done-clipboard.json')
                    : require('@/assets/animations/empty-assessment.json')}
                loop={false}
                style={styles.animation}
            />

            <JempText type="h1" style={styles.centeredText}>
                {t(allDone ? 'ui.no_assessments_all_done_title' : 'ui.no_assessments_title')}
            </JempText>
            <JempText type="body-sm" color={theme.textMuted} style={styles.centeredText}>
                {t(allDone ? 'ui.no_assessments_all_done_body' : 'ui.no_assessments_body')}
            </JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    // Zentriert, aber per paddingBottom nach oben geschoben
    card: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 120,
        gap: 12,
    },
    animation: { width: 120, height: 120, marginBottom: -4 },
    centeredText: { textAlign: 'center' },
});
