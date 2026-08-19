import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { NumberWheel } from '@/components/ui/number-wheel';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

// cm ↔ ft/in und kg ↔ lb — gespeichert wird immer metrisch
function cmToFtIn(cm: number): { ft: number; inch: number } {
    const totalIn = Math.round(cm / 2.54);
    return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}
const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
const kgToLb = (kg: number) => Math.round(kg * 2.2046);
const lbToKg = (lb: number) => Math.round(lb / 2.2046);

export function BodyStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedWeight = useOnboardingStore((s) => s.weight_in_kg);
    const storedHeight = useOnboardingStore((s) => s.height_in_cm);
    const storedUnitSystem = useOnboardingStore((s) => s.unit_system);
    const setStore = useOnboardingStore((s) => s.set);
    const [weightKg, setWeightKg] = useState(storedWeight ?? 75);
    const [heightCm, setHeightCm] = useState(storedHeight ?? 175);
    // Ein System für alle Werte — persistiert als App-weite Anzeige-Präferenz
    const imperial = storedUnitSystem === 'imperial';
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        setCanContinue(true);
        setStore({ weight_in_kg: weightKg, height_in_cm: heightCm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function setUnitSystem(system: 'metric' | 'imperial') {
        if ((system === 'imperial') === imperial) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStore({ unit_system: system });
    }

    function updateHeight(cm: number) {
        setHeightCm(cm);
        setStore({ height_in_cm: cm });
    }

    function updateWeight(kg: number) {
        setWeightKg(kg);
        setStore({ weight_in_kg: kg });
    }

    const { ft, inch } = cmToFtIn(heightCm);

    return (
        <StepScaffold title={t('onboarding.body_title')} subtitle={t('onboarding.body_subtitle')} centerContent>
            <View style={styles.block}>
            {/* ── Unit-Toggle: Imperial ⇄ Metric ── */}
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.unitRow}>
                <Pressable onPress={() => setUnitSystem('imperial')} hitSlop={8}>
                    <JempText type="body-l" color={imperial ? theme.text : theme.textSubtle} style={styles.unitLabel}>
                        {t('onboarding.body_unit_imperial')}
                    </JempText>
                </Pressable>
                <Switch
                    value={!imperial}
                    onValueChange={(metric) => setUnitSystem(metric ? 'metric' : 'imperial')}
                    trackColor={{ false: theme.borderStrong, true: GradientMid }}
                    thumbColor="#fff"
                />
                <Pressable onPress={() => setUnitSystem('metric')} hitSlop={8}>
                    <JempText type="body-l" color={imperial ? theme.textSubtle : theme.text} style={styles.unitLabel}>
                        {t('onboarding.body_unit_metric')}
                    </JempText>
                </Pressable>
            </Animated.View>

            {/* ── Wheels: Größe links, Gewicht rechts ── */}
            <Animated.View entering={FadeInDown.delay(480).duration(500).springify()} style={styles.wheelRow}>
                <View style={styles.wheelGroup}>
                    <JempText type="button" color={theme.text}>{t('ui.height')}</JempText>
                    {imperial ? (
                        <View style={styles.wheelPair} key="imperial-height">
                            <View style={styles.wheel}>
                                <NumberWheel
                                    initialValue={ft}
                                    min={3}
                                    max={7}
                                    extendable={false}
                                    formatLabel={(v) => `${v} ft`}
                                    onChange={(v) => updateHeight(ftInToCm(v, inch))}
                                />
                            </View>
                            <View style={styles.wheel}>
                                <NumberWheel
                                    initialValue={inch}
                                    min={0}
                                    max={11}
                                    extendable={false}
                                    formatLabel={(v) => `${v} in`}
                                    onChange={(v) => updateHeight(ftInToCm(ft, v))}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.wheelFull} key="metric-height">
                            <NumberWheel
                                initialValue={heightCm}
                                min={120}
                                max={220}
                                extendable={false}
                                formatLabel={(v) => `${v} cm`}
                                onChange={updateHeight}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.wheelGroup}>
                    <JempText type="button" color={theme.text}>{t('ui.weight')}</JempText>
                    {imperial ? (
                        <View style={styles.wheelFull} key="imperial-weight">
                            <NumberWheel
                                initialValue={kgToLb(weightKg)}
                                min={70}
                                max={440}
                                extendable={false}
                                formatLabel={(v) => `${v} lb`}
                                onChange={(v) => updateWeight(lbToKg(v))}
                            />
                        </View>
                    ) : (
                        <View style={styles.wheelFull} key="metric-weight">
                            <NumberWheel
                                initialValue={weightKg}
                                min={35}
                                max={200}
                                extendable={false}
                                formatLabel={(v) => `${v} kg`}
                                onChange={updateWeight}
                            />
                        </View>
                    )}
                </View>
            </Animated.View>
            </View>
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    block: {},
    unitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 28,
    },
    unitLabel: {
        fontWeight: '600',
    },
    wheelRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    // Feste Breite in beiden Unit-Systemen — der Toggle darf nichts verschieben
    wheelGroup: {
        alignItems: 'center',
        gap: 10,
        flex: 1,
        maxWidth: 170,
    },
    wheelPair: {
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'stretch',
    },
    // In der ft/in-Row regelt flex die BREITE — Höhe kommt vom Rad selbst
    wheel: {
        flex: 1,
    },
    // Einzelnes Rad in der Column: volle Breite, echte Content-Höhe
    // (flex:1 würde hier auf Höhe 0 kollabieren → Layout-Sprung beim Toggle)
    wheelFull: {
        alignSelf: 'stretch',
    },
});
