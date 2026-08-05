import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { HeightTape, WeightTape } from '@/components/ui/measurement-tape';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

function UnitSegment({ label, active, onPress, theme }: {
    label: string;
    active: boolean;
    onPress: () => void;
    theme: typeof Colors.dark;
}) {
    return (
        <Pressable
            onPress={() => {
                if (active) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            style={[
                styles.unitSegment,
                active
                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
            ]}
        >
            <JempText type="caption" color={active ? GradientMid : theme.textMuted} style={styles.unitSegmentText}>
                {label}
            </JempText>
        </Pressable>
    );
}

export function BodyStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedWeight = useOnboardingStore((s) => s.weight_in_kg);
    const storedHeight = useOnboardingStore((s) => s.height_in_cm);
    const setStore = useOnboardingStore((s) => s.set);
    const storedUnitSystem = useOnboardingStore((s) => s.unit_system);
    const [weightKg, setWeightKg] = useState(storedWeight ?? 75);
    const [heightCm, setHeightCm] = useState(storedHeight ?? 175);
    // One system for both tapes — persisted as the app-wide display preference
    const imperial = storedUnitSystem === 'imperial';
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
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>{t('onboarding.body_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.body_subtitle')}
                </JempText>
            </Animated.View>
            <View style={styles.tapes}>
                <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                    <WeightTape
                        valueKg={weightKg}
                        onChange={handleWeight}
                        unit={imperial ? 'lbs' : 'kg'}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(480).duration(500).springify()}>
                    <HeightTape
                        valueCm={heightCm}
                        onChange={handleHeight}
                        unit={imperial ? 'in' : 'cm'}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(600).duration(500).springify()} style={styles.unitToggleWrap}>
                    <View style={[styles.unitToggle, { backgroundColor: theme.surface }]}>
                        <UnitSegment
                            label="kg · cm"
                            active={!imperial}
                            onPress={() => setStore({ unit_system: 'metric' })}
                            theme={theme}
                        />
                        <UnitSegment
                            label="lbs · in"
                            active={imperial}
                            onPress={() => setStore({ unit_system: 'imperial' })}
                            theme={theme}
                        />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    headline: {
        marginBottom: 10,
    },
    subtitle: {
        lineHeight: 20,
    },
    tapes: {
        flex: 1,
        justifyContent: 'center',
        gap: 40,
        // Optischer Ausgleich für den Continue-Button
        paddingBottom: 60,
    },
    unitToggleWrap: {
        alignItems: 'center',
    },
    unitToggle: {
        flexDirection: 'row',
        borderRadius: 100,
        padding: 3,
        gap: 3,
    },
    unitSegment: {
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 7,
        paddingHorizontal: 16,
    },
    unitSegmentText: {
        fontWeight: '600',
    },
});
