import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Logo from '@/assets/logo.svg';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';

export function WelcomeStep() {
    const { nextStep } = useOnboardingControl();

    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoY = useRef(new Animated.Value(-12)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textY = useRef(new Animated.Value(16)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.stagger(140, [
            Animated.parallel([
                Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(logoY, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(textY, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(buttonOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(buttonY, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
        ]).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
                    <Logo width={72} height={72} />
                </Animated.View>

                <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
                    <Text style={styles.eyebrow}>WILLKOMMEN BEI VEEZY</Text>
                    <Text style={styles.title}>Dein Leben.{'\n'}Deine Vision.</Text>
                    <Text style={styles.subtitle}>
                        Visualisiere deine Zukunft und{'\n'}manifestiere dein Traumleben.
                    </Text>
                </Animated.View>

                <Animated.View style={{ opacity: buttonOpacity, transform: [{ translateY: buttonY }] }}>
                    <TouchableOpacity style={styles.button} onPress={nextStep} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>Los geht's</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 32,
    },
    logoWrapper: {
        alignItems: 'center',
    },
    eyebrow: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        letterSpacing: 2.5,
        color: Colors.accent,
        marginBottom: 12,
        textAlign: 'center',
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 44,
        lineHeight: 54,
        color: Colors.textHeadline,
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 16,
        lineHeight: 25,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    button: {
        backgroundColor: Colors.accent,
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 999,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    buttonText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 16,
        color: '#ffffff',
        letterSpacing: 0.3,
    },
});
