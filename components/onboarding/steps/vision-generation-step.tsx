import VisionLoading from '@/components/layout/VisionLoading';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { MediaHandler } from '@/lib/media-handler';
import { useUserDataStore } from '@/stores/UserDataStore';
import { useVisionStore } from '@/stores/VisionStore';
import { VisionCategory } from '@/types/vision';
import { generateVision } from '@/utils/generateVision';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StepState = 'loading' | 'preview' | 'error';

type GeneratedResult = {
    phrase: string;
    category: string;
    imageKey: string;
};

export function VisionGenerationStep() {
    const { t } = useTranslation();
    const { visionDescription, nextStep } = useOnboardingControl();
    const insets = useSafeAreaInsets();

    const [stepState, setStepState] = useState<StepState>('loading');
    const [result, setResult] = useState<GeneratedResult | null>(null);
    const [savedPath, setSavedPath] = useState<string | null>(null);

    const imageOpacity = useRef(new Animated.Value(0)).current;
    const phraseOpacity = useRef(new Animated.Value(0)).current;
    const phraseTranslate = useRef(new Animated.Value(20)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslate = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        runGeneration();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function runGeneration() {
        try {
            const { userId, motivationStyle, language } = useUserDataStore.getState();
            const existingPhrases = useVisionStore.getState().visions.map((v) => v.phrase).filter(Boolean);
            const generated = await generateVision(visionDescription, userId, existingPhrases, motivationStyle, language);
            const path = await MediaHandler.saveFromRemote(generated.imageUrl, generated.imageKey);
            useVisionStore.getState().addVision({
                id: generated.visionId,
                title: '',
                phrase: generated.phrase,
                category: generated.category as VisionCategory,
                imagePath: path,
                imageVersion: 1,
                affirmationsAffirmation: generated.affirmationsAffirmation,
                affirmationsFuel: generated.affirmationsFuel,
            });
            setResult({ phrase: generated.phrase, category: generated.category, imageKey: generated.imageKey });
            setSavedPath(path);
            setStepState('preview');
            animatePreviewIn();
        } catch (error) {
            console.error(error);
            setStepState('error');
        }
    }

    function animatePreviewIn() {
        imageOpacity.setValue(0);
        phraseOpacity.setValue(0);
        phraseTranslate.setValue(20);
        buttonOpacity.setValue(0);
        buttonTranslate.setValue(16);
        Animated.sequence([
            Animated.timing(imageOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(phraseOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(phraseTranslate, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(buttonOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(buttonTranslate, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
        ]).start();
    }

    if (stepState === 'loading') {
        return (
            <View style={styles.container}>
                <VisionLoading />
            </View>
        );
    }

    if (stepState === 'error') {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>{t('onboarding.vision_generation.error_title')}</Text>
                    <Text style={styles.errorSub}>{t('onboarding.vision_generation.error_sub')}</Text>
                    <TouchableOpacity style={styles.continueButton} onPress={nextStep} activeOpacity={0.85}>
                        <Text style={styles.continueText}>{t('onboarding.vision_generation.continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {savedPath && (
                <Animated.Image
                    source={{ uri: MediaHandler.toUri(savedPath) }}
                    style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}
                    resizeMode="cover"
                />
            )}

            <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'transparent']}
                style={[StyleSheet.absoluteFill, { bottom: undefined, height: 180 }]}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.80)']}
                style={[StyleSheet.absoluteFill, { top: undefined, height: 500 }]}
            />

            <View style={[styles.previewBottom, { paddingBottom: insets.bottom + 32 }]}>
                <Animated.View style={[styles.phraseCard, { opacity: phraseOpacity, transform: [{ translateY: phraseTranslate }] }]}>
                    <Text style={styles.category}>{(result?.category ?? '').toUpperCase()}</Text>
                    <Text style={styles.phrase}>{result?.phrase}</Text>
                </Animated.View>
                <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity, transform: [{ translateY: buttonTranslate }] }]}>
                    <TouchableOpacity style={styles.continueButton} onPress={nextStep} activeOpacity={0.85}>
                        <Text style={styles.continueText}>{t('onboarding.vision_generation.continue')}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    errorTitle: {
        color: 'white',
        fontFamily: Fonts.serifBold,
        fontSize: 20,
        textAlign: 'center',
    },
    errorSub: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        textAlign: 'center',
    },
    previewBottom: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        gap: 16,
    },
    phraseCard: {
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 5,
    },
    category: {
        color: Colors.accent,
        fontFamily: Fonts.sansSemiBold,
        fontSize: 10,
        letterSpacing: 2.5,
    },
    phrase: {
        color: 'rgba(255,255,255,0.92)',
        fontFamily: Fonts.serifBold,
        fontSize: 22,
        lineHeight: 30,
    },
    buttonContainer: {
        width: '100%',
    },
    continueButton: {
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    continueText: {
        color: '#0d0d0d',
        fontFamily: Fonts.sansSemiBold,
        fontSize: 16,
        fontWeight: '700',
    },
});
