import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { devLog } from '@/utils/dev-log';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OnboardingControlContext } from './onboarding-control-context';
import { OnboardingStep } from './types';

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

    const opacity = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;

    const step = steps[currentIndex];
    const StepComponent = step.component;
    const isLight = step.theme === 'light';
    const showProgress = step.showProgressIndicator ?? true;
    const showContinue = step.showContinueButton ?? true;
    const continueText = step.continueButtonText ?? 'Continue';


    async function finishOnboarding() {
        try {
            trackerManager.track('onboarding_completed');
            if (session) {
                devLog('Finishing onboarding for user:', session.user.id);
                const { set, reset, ...profileData } = onboardingData;
                await supabase
                    .from('user_profiles')
                    .update({ ...profileData, has_onboarded: true })
                    .eq('id', session.user.id);
                reset();
                await refreshProfile();
            }
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
            {/* Outer view holds the PREVIOUS step's bg — visible during crossfade */}
            <View style={[styles.container]}>
                {/* Animated view brings the NEW step's bg + all content */}
                <Animated.View style={[styles.screen, { opacity, transform: [{ translateX }] }]}>
                    {showProgress && (
                        <View style={styles.progressBar}>
                            {steps.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.progressSegment,
                                        i <= currentIndex && (isLight ? styles.progressSegmentActiveLight : styles.progressSegmentActive),
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    <View style={styles.stepContainer}>
                        <StepComponent />
                    </View>

                    {showContinue && (
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.continueButton,
                                    isLight && styles.continueButtonLight,
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
                                {isLoading ? (
                                    <ActivityIndicator color={isLight ? 'white' : '#0d0d0d'} />
                                ) : (
                                    <Text style={[styles.continueButtonText, isLight && styles.continueButtonTextLight]}>{continueText}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
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
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    progressSegmentActive: {
        backgroundColor: 'white',
    },
    progressSegmentActiveLight: {
        backgroundColor: '#1a1a1a',
    },
    stepContainer: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 48,
    },
    continueButton: {
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    continueButtonLight: {
        backgroundColor: '#1a1a1a',
    },
    continueButtonDisabled: {
        opacity: 0.35,
    },
    continueButtonText: {
        color: '#0d0d0d',
        fontSize: 16,
        fontWeight: '700',
    },
    continueButtonTextLight: {
        color: 'white',
    },
});
