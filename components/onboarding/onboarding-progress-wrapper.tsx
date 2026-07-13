import { Cyan, Electric, GradientMid } from '@/constants/theme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { OnboardingBackground } from './onboarding-background';
import { OnboardingControlContext } from './onboarding-control-context';
import { OnboardingStep } from './types';

const enterFromRight = new Keyframe({
    0: { opacity: 0, transform: [{ translateX: 48 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }] },
}).duration(340);

const exitToLeft = new Keyframe({
    0: { opacity: 1, transform: [{ translateX: 0 }] },
    100: { opacity: 0, transform: [{ translateX: -48 }] },
}).duration(340);

const enterFromLeft = new Keyframe({
    0: { opacity: 0, transform: [{ translateX: -48 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }] },
}).duration(340);

const exitToRight = new Keyframe({
    0: { opacity: 1, transform: [{ translateX: 0 }] },
    100: { opacity: 0, transform: [{ translateX: 48 }] },
}).duration(340);

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

type Props = {
    steps: OnboardingStep[];
};

export function OnboardingProgressWrapper({ steps }: Props) {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [canContinue, setCanContinue] = useState(steps[0].initialCanContinue ?? true);
    const [isLoading, setIsLoading] = useState(false);
    const onDisabledPressRef = useRef<(() => void) | null>(null);
    function setOnDisabledPress(fn: () => void) { onDisabledPressRef.current = fn; }
    // prevBg = background of the outgoing step, stays visible underneath during fade

    const [visionDescription, setVisionDescription] = useState('');
    const inFlightRef = useRef(false);
    const { openWithPlacement, update } = useSuperwallFunctions();
    const { session } = useAuth();
    const { refreshProfile } = useCurrentUser();
    const onboardingData = useOnboardingStore();

    const step = steps[currentIndex];
    const StepComponent = step.component;
    const isLight = step.theme === 'light';
    const showProgress = step.showProgressIndicator ?? true;
    const showContinue = step.showContinueButton ?? true;
    const continueText = step.continueButtonText ?? t('onboarding.btn_continue');


    async function finishOnboarding() {
        // Guard against re-entry: the continue button stays mounted while the
        // paywall is loading, and a second run would persist the reset store.
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setIsLoading(true);
        try {
            if (session?.user?.id) {
                const { first_name, last_name, birth_date, gender, sport_id, height_in_cm, weight_in_kg, preferred_workout_days, preferred_session_duration, schedule_notes, timezone } = onboardingData;
                const { error } = await supabase
                    .from('user_profiles')
                    .update({ first_name, last_name, birth_date, gender, sport_id, height_in_cm, weight_in_kg, preferred_workout_days, preferred_session_duration, schedule_notes, timezone, has_onboarded: true })
                    .eq('id', session.user.id);
                if (error) throw error;
            }
            const referralCode = onboardingData.referral_code;

            const navigate = async () => {
                await refreshProfile();
                router.replace('/tutorial');
                onboardingData.reset();
            }
            if (referralCode) {
                await update({ promocode: referralCode });
            }
            await openWithPlacement('onboarding_completed', navigate, undefined, navigate);
        } catch (error: any) {
            console.error('Error finishing onboarding:', error);
            Alert.alert(t('ui.error'), error?.message ?? '');
        } finally {
            inFlightRef.current = false;
            setIsLoading(false);
        }
    }

    function advance() {
        if (currentIndex < steps.length - 1) {
            let nextIndex = currentIndex + 1;
            while (nextIndex < steps.length - 1 && steps[nextIndex].shouldSkip?.()) {
                nextIndex++;
            }
            setDirection('forward');
            setCurrentIndex(nextIndex);
            setCanContinue(steps[nextIndex].initialCanContinue ?? true);
        } else {
            finishOnboarding();
        }
    }

    function prevStep() {
        if (currentIndex <= 0) return;
        let prevIndex = currentIndex - 1;
        while (prevIndex > 0 && steps[prevIndex].shouldSkip?.()) {
            prevIndex--;
        }
        setDirection('back');
        setCurrentIndex(prevIndex);
        setCanContinue(steps[prevIndex].initialCanContinue ?? true);
    }

    function nextStep() {
        if (inFlightRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (step.preContinue) {
            inFlightRef.current = true;
            setIsLoading(true);
            step.preContinue().finally(() => {
                inFlightRef.current = false;
                setIsLoading(false);
                advance();
            });
        } else {
            advance();
        }
    }

    useEffect(() => {

        trackerManager.track('onboarding_step', { step: step.component.name, index: currentIndex });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    return (
        <OnboardingControlContext.Provider value={{ currentIndex, canContinue, finishOnboarding, setCanContinue, setOnDisabledPress, nextStep, visionDescription, setVisionDescription }}>
            <View style={styles.container}>
                <OnboardingBackground />
                {showProgress && (
                    <View style={styles.progressBar}>
                        {currentIndex > 0 && (
                            <TouchableOpacity onPress={prevStep} style={styles.backButton} hitSlop={12}>
                                <Text style={[styles.backArrow, isLight && styles.backArrowLight]}>‹</Text>
                            </TouchableOpacity>
                        )}
                        <View style={styles.progressSegments}>
                            {steps.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.progressSegment,
                                        { backgroundColor: i <= currentIndex ? GradientMid : (isLight ? '#bfbfbf' : '#595959') },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.stepContainer}>
                    <Animated.View
                        key={currentIndex}
                        entering={direction === 'back' ? enterFromLeft : enterFromRight}
                        exiting={direction === 'back' ? exitToRight : exitToLeft}
                        style={StyleSheet.absoluteFill}
                    >
                        <StepComponent />
                    </Animated.View>
                </View>

                {showContinue && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                (!canContinue || isLoading) && styles.continueButtonDisabled,
                            ]}
                            onPress={() => {
                                if (!canContinue || isLoading) {
                                    onDisabledPressRef.current?.();
                                    return;
                                }
                                nextStep();
                            }}
                        >
                            <LinearGradient
                                colors={GRADIENT}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.continueButtonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.continueButtonText}>{continueText}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </OnboardingControlContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screen: {
        flex: 1,
    },
    progressBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        gap: 10,
    },
    backButton: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: {
        color: 'white',
        fontSize: 36,
        lineHeight: 36,
        marginTop: -4,
    },
    backArrowLight: {
        color: '#1a1a1a',
    },
    progressSegments: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
    },
    progressSegment: {
        flex: 1,
        height: 3,
        borderRadius: 2,
    },
    stepContainer: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 48,
    },
    continueButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    continueButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.35,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
