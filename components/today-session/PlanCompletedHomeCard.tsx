import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { JempText } from '../jemp-text';

export function PlanCompletedHomeCard() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();

    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const checkRef = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        checkRef.current?.reset();
        checkRef.current?.play();
    }, []));

    return (
        <View style={styles.root}>
            <LottieView
                ref={checkRef}
                source={require('@/assets/animations/check.json')}
                loop={false}
                style={styles.checkAnimation}
            />
            <JempText type="h2" style={styles.centeredText}>
                {t('ui.plan_completed_title')}
            </JempText>
            <JempText type="body-sm" color={theme.textMuted} style={styles.centeredText}>
                {t('ui.plan_completed_home_body')}
            </JempText>
            <Pressable style={styles.cta} onPress={() => router.navigate('/(tabs)/plan')}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                >
                    <JempText type="button" color="#fff">
                        {t('ui.plan_completed_home_cta')}
                    </JempText>
                </LinearGradient>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
    },
    checkAnimation: {
        width: 56,
        height: 56,
    },
    centeredText: {
        textAlign: 'center',
    },
    cta: {
        marginTop: 8,
        borderRadius: 100,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    ctaGradient: {
        height: 40,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
