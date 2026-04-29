import * as Haptics from 'expo-haptics';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Cyan, Electric, GradientMid } from '@/constants/theme';
import { devLog } from '@/utils/dev-log';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

const enterFromRight = new Keyframe({
    0: { opacity: 0, transform: [{ translateX: 48 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }] },
}).duration(340);

const exitToLeft = new Keyframe({
    0: { opacity: 1, transform: [{ translateX: 0 }] },
    100: { opacity: 0, transform: [{ translateX: -48 }] },
}).duration(340);
import { OnboardingBackground } from './onboarding-background';
import { OnboardingControlContext } from './onboarding-control-context';
import { OnboardingStep } from './types';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

type Props = {
    steps: OnboardingStep[];
};

export function OnboardingProgressWrapper({ steps }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [canContinue, setCanContinue] = useState(steps[0].initialCanContinue ?? true);
    const [isLoading, setIsLoading] = useState(false);
    const onDisabledPressRef = useRef<(() => void) | null>(null);
    function setOnDisabledPress(fn: () => void) { onDisabledPressRef.current = fn; }
    // prevBg = background of the outgoing step, stays visible underneath during fade

    const [visionDescription, setVisionDescription] = useState('');
    const inFlightRef = useRef(false);
    const { openWithPlacement } = useSuperwallFunctions();
    const { session } = useAuth();
    const { refreshProfile } = useCurrentUser();
    const onboardingData = useOnboardingStore();

    const step = steps[currentIndex];
    const StepComponent = step.component;
    const isLight = step.theme === 'light';
    const showProgress = step.showProgressIndicator ?? true;
    const showContinue = step.showContinueButton ?? true;
    const continueText = step.continueButtonText ?? 'Continue';


    async function finishOnboarding() {
        try {
            if (session?.user?.id) {
                await supabase
                    .from('user_profiles')
                    .update({ has_onboarded: true })
                    .eq('id', session.user.id);
            }
            onboardingData.reset();
            await refreshProfile();
            const navigate = () => router.replace('/(tabs)');
            await openWithPlacement('onboarding_completed', navigate, undefined, navigate);
        } catch (error) {
            console.error('Error finishing onboarding:', error);
        }
    }

    function advance() {
        if (currentIndex < steps.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setCanContinue(steps[nextIndex].initialCanContinue ?? true);
        } else {
            finishOnboarding();
        }
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
                )}

                <View style={styles.stepContainer}>
                    <Animated.View
                        key={currentIndex}
                        entering={enterFromRight}
                        exiting={exitToLeft}
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
        paddingHorizontal: 20,
        paddingTop: 60,
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
