import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { HeightSlider, WeightSlider } from '@/components/ui/measurement-slider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function BodyStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedWeight = useOnboardingStore((s) => s.weight_in_kg);
    const storedHeight = useOnboardingStore((s) => s.height_in_cm);
    const setStore = useOnboardingStore((s) => s.set);
    const [weightKg, setWeightKg] = useState(storedWeight ?? 75);
    const [heightCm, setHeightCm] = useState(storedHeight ?? 175);
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        setCanContinue(true);
        setStore({ weight_in_kg: weightKg, height_in_cm: heightCm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleWeight(kg: number) {
        setWeightKg(kg);
        setStore({ weight_in_kg: kg, height_in_cm: heightCm });
    }

    function handleHeight(cm: number) {
        setHeightCm(cm);
        setStore({ weight_in_kg: weightKg, height_in_cm: cm });
    }

    return (
        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>{t('onboarding.body_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.body_subtitle')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <WeightSlider
                    valueKg={weightKg}
                    onChange={handleWeight}
                    unit={weightUnit}
                    onToggleUnit={() => setWeightUnit(u => u === 'kg' ? 'lbs' : 'kg')}
                />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(480).duration(500).springify()}>
                <HeightSlider
                    valueCm={heightCm}
                    onChange={handleHeight}
                    unit={heightUnit}
                    onToggleUnit={() => setHeightUnit(u => u === 'cm' ? 'ft' : 'cm')}
                />
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 32,
    },
    headline: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 8,
    },
});
