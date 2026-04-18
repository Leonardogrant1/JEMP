import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export function PhotoBridgeStep() {
    const { t } = useTranslation();
    const line1Opacity = useRef(new Animated.Value(0)).current;
    const line1Y = useRef(new Animated.Value(14)).current;
    const line2Opacity = useRef(new Animated.Value(0)).current;
    const line2Y = useRef(new Animated.Value(14)).current;
    const line3Opacity = useRef(new Animated.Value(0)).current;
    const line3Y = useRef(new Animated.Value(14)).current;

    useEffect(() => {
        Animated.stagger(200, [
            Animated.parallel([
                Animated.timing(line1Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(line1Y, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(line2Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(line2Y, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(line3Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(line3Y, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
        ]).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.Text style={[styles.prelude, { opacity: line1Opacity, transform: [{ translateY: line1Y }] }]}>
                    {t('onboarding.photo_bridge.teaser')}
                </Animated.Text>
                <Animated.Text style={[styles.headline, { opacity: line2Opacity, transform: [{ translateY: line2Y }] }]}>
                    {t('onboarding.photo_bridge.headline')}
                </Animated.Text>
                <Animated.Text style={[styles.sub, { opacity: line3Opacity, transform: [{ translateY: line3Y }] }]}>
                    {t('onboarding.photo_bridge.subtext')}
                </Animated.Text>
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
        paddingHorizontal: 36,
        gap: 20,
    },
    prelude: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 18,
        color: Colors.textMuted,
    },
    headline: {
        fontFamily: Fonts.serifBold,
        fontSize: 42,
        lineHeight: 54,
        color: Colors.textHeadline,
    },
    sub: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 18,
        lineHeight: 28,
        color: Colors.textMuted,
    },
});
