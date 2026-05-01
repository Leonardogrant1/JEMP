import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableRow } from '@/components/ui/selectable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Gender } from '@/types/database';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function GenderStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedGender = useOnboardingStore((s) => s.gender);
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<Gender | null>(storedGender);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (storedGender) setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const OPTIONS: { value: Gender; label: string; icon: 'male' | 'female' }[] = [
        { value: 'male', label: t('onboarding.gender_male'), icon: 'male' },
        { value: 'female', label: t('onboarding.gender_female'), icon: 'female' },
    ];

    function select(value: Gender) {
        setSelected(value);
        setStore({ gender: value });
        setCanContinue(true);
    }

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>{t('onboarding.gender_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.gender_subtitle')}
                </JempText>
            </Animated.View>
            <View style={styles.options}>
                {OPTIONS.map((opt, i) => (
                    <Animated.View key={opt.value} entering={FadeInDown.delay(360 + i * 120).duration(500).springify()}>
                        <SelectableRow
                            label={opt.label}
                            icon={opt.icon}
                            selected={selected === opt.value}
                            onPress={() => select(opt.value)}
                        />
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingVertical: 32,
        justifyContent: 'center',
    },
    headline: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 40,
    },
    options: {
        gap: 12,
    },
});
