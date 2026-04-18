import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';

const PLACEHOLDER_IMAGE = require('@/assets/category-images/endurance.jpeg');

const LOADING_MESSAGES = [
    'Vision wird analysiert...',
    'Deine Zukunft wird visualisiert...',
    'Bild wird generiert...',
    'Fast fertig...',
];

export function GenerateImageStep() {
    const { setCanContinue } = useOnboardingControl();
    const [messageIndex, setMessageIndex] = useState(0);
    const [done, setDone] = useState(false);
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setCanContinue(false);
        let index = 0;
        const interval = setInterval(() => {
            index += 1;
            if (index >= LOADING_MESSAGES.length) {
                clearInterval(interval);
                setTimeout(() => {
                    setDone(true);
                    setCanContinue(true);
                    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
                }, 800);
            } else {
                setMessageIndex(index);
            }
        }, 900);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setCanContinue]);

    return (
        <View style={styles.container}>
            {!done ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingTitle}>KI generiert{'\n'}dein Bild...</Text>
                    <Text style={styles.loadingMessage}>{LOADING_MESSAGES[messageIndex]}</Text>
                </View>
            ) : (
                <Animated.View style={[styles.resultContainer, { opacity }]}>
                    <Text style={styles.resultTitle}>Deine Vision ✨</Text>
                    <Image source={PLACEHOLDER_IMAGE} style={styles.image} resizeMode="cover" />
                    <Text style={styles.resultSub}>So könnte deine Zukunft aussehen</Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
        justifyContent: 'center',
    },
    loadingContainer: {
        gap: 16,
    },
    loadingTitle: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 40,
    },
    loadingMessage: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
    },
    resultContainer: {
        alignItems: 'center',
        gap: 16,
    },
    resultTitle: {
        color: 'white',
        fontSize: 26,
        fontWeight: '700',
    },
    image: {
        width: '100%',
        height: 340,
        borderRadius: 20,
    },
    resultSub: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});
