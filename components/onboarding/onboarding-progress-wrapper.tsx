import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gold } from '@/constants/theme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { useUserDataStore } from '@/stores/UserDataStore';
import { router } from 'expo-router';
import { openPlacementWithImage } from '@/utils/openPlacementWithImage';
import { OnboardingControlContext } from './onboarding-control-context';
import { OnboardingStep } from './types';

type Props = {
    steps: OnboardingStep[];
};

function bgForStep(step: OnboardingStep) {
    return step.theme === 'light' ? '#f5f0e6' : '#0d0d0d';
}

function useFloatAnim(config: { distance: number; duration: number; delay?: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: config.distance, duration: config.duration, delay: config.delay ?? 0, useNativeDriver: true }),
                Animated.timing(anim, { toValue: -config.distance, duration: config.duration, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: config.duration, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return anim;
}

export function OnboardingProgressWrapper({ steps }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [canContinue, setCanContinue] = useState(steps[0].initialCanContinue ?? true);
    const [isLoading, setIsLoading] = useState(false);
    const onDisabledPressRef = useRef<(() => void) | null>(null);
    function setOnDisabledPress(fn: () => void) { onDisabledPressRef.current = fn; }
    // prevBg = background of the outgoing step, stays visible underneath during fade
    const [prevBg, setPrevBg] = useState(() => bgForStep(steps[0]));
    const [visionDescription, setVisionDescription] = useState('');
    const inFlightRef = useRef(false);
    const { openWithPlacement } = useSuperwallFunctions();

    const blob1Y = useFloatAnim({ distance: 18, duration: 3200 });
    const blob1X = useFloatAnim({ distance: 12, duration: 4100, delay: 300 });
    const blob2Y = useFloatAnim({ distance: 22, duration: 3800, delay: 600 });
    const blob2X = useFloatAnim({ distance: 14, duration: 3500, delay: 100 });
    const blob3Y = useFloatAnim({ distance: 14, duration: 4400, delay: 800 });

    const opacity = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;

    const step = steps[currentIndex];
    const StepComponent = step.component;
    const isLight = step.theme === 'light';
    const showProgress = step.showProgressIndicator ?? true;
    const showContinue = step.showContinueButton ?? true;
    const continueText = step.continueButtonText ?? 'Continue';

    function animateIn() {
        opacity.setValue(0);
        translateX.setValue(20);
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            setPrevBg(bgForStep(step));
        });
    }

    async function finishOnboarding() {
        trackerManager.track('onboarding_completed');
        useUserDataStore.getState().completeOnboarding();
        const navigate = () => router.replace('/');
        await openPlacementWithImage(openWithPlacement, 'onboarding_completed', navigate, undefined, navigate);
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
        animateIn();
        trackerManager.track('onboarding_step', { step: step.component.name, index: currentIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    return (
        <OnboardingControlContext.Provider value={{ currentIndex, canContinue, finishOnboarding, setCanContinue, setOnDisabledPress, nextStep, visionDescription, setVisionDescription }}>
            {/* Outer view holds the PREVIOUS step's bg — visible during crossfade */}
            <View style={[styles.container, { backgroundColor: prevBg }]}>
                {/* Animated view brings the NEW step's bg + all content */}
                <Animated.View style={[styles.screen, { backgroundColor: bgForStep(step), opacity, transform: [{ translateX }] }]}>
                    {isLight && (
                        <>
                            <Animated.View style={[styles.blob, styles.blobTop, { transform: [{ translateY: blob1Y }, { translateX: blob1X }] }]} />
                            <Animated.View style={[styles.blob, styles.blobBottom, { transform: [{ translateY: blob2Y }, { translateX: blob2X }] }]} />
                            <Animated.View style={[styles.blob, styles.blobCenter, { transform: [{ translateY: blob3Y }] }]} />
                        </>
                    )}

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
    blob: {
        position: 'absolute',
        borderRadius: 999,
    },
    blobTop: {
        width: 380,
        height: 380,
        backgroundColor: Gold[400],
        top: -120,
        right: -100,
        opacity: 0.35,
    },
    blobBottom: {
        width: 320,
        height: 320,
        backgroundColor: Gold[300],
        bottom: -80,
        left: -80,
        opacity: 0.35,
    },
    blobCenter: {
        width: 200,
        height: 200,
        backgroundColor: Gold[500],
        top: '35%',
        left: '20%',
        opacity: 0.15,
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
