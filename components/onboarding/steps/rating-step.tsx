import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Gold } from '@/constants/theme';
import { useUserDataStore } from '@/stores/UserDataStore';

function useFadeSlide(delay: number) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;
    useEffect(() => {
        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
            ]).start();
        }, delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return { opacity, transform: [{ translateY }] } as const;
}

export function RatingStep() {
    const name = useUserDataStore((s) => s.name);
    const displayName = name.trim() || 'du';

    const titleAnim = useFadeSlide(150);
    const bodyAnim = useFadeSlide(400);
    const badgeAnim = useFadeSlide(700);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.View style={titleAnim}>
                    <Text style={styles.title}>Du bist dabei,{'\n'}{displayName}.</Text>
                    <Text style={styles.subtitle}>
                        veezy wurde entwickelt, um dich jeden Tag an das zu erinnern, was dir wirklich wichtig ist.{'\n\n'}
                        Wenn du glaubst, was wir aufbauen — hilf uns, mehr Menschen wie dich zu erreichen.
                    </Text>
                </Animated.View>

                <Animated.View style={[styles.badge, badgeAnim]}>
                    <Text style={styles.badgeIcon}>⭐</Text>
                    <Text style={styles.badgeText}>Es dauert 5 Sekunden und bedeutet uns alles.</Text>
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
        paddingHorizontal: 32,
        gap: 32,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 36,
        lineHeight: 46,
        color: Colors.textHeadline,
        marginBottom: 24,
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 15,
        lineHeight: 24,
        color: Colors.textMuted,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(201,168,76,0.08)',
        borderWidth: 1,
        borderColor: Gold[300],
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 18,
    },
    badgeIcon: {
        fontSize: 22,
    },
    badgeText: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textMuted,
        flex: 1,
    },
});
