import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { SelectableRow } from '@/components/ui/selectable-row';
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
        <StepScaffold title={t('onboarding.gender_title')} subtitle={t('onboarding.gender_subtitle')} centerContent>
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
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    options: {
        gap: 12,
    },
});
