import { JempText } from '@/components/jemp-text';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import LaurelLeft from '@/assets/icons/laurel_left.svg';
import LaurelRight from '@/assets/icons/laurel_right.svg';
import * as StoreReview from 'expo-store-review';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const STAR_YELLOW = '#FBBF24';
const RATING = '4.8';

// Echte App-Store-Reviews (gleiche Quelle wie die Landing-Page-Testimonials),
// Anzeigenamen statt Store-Usernames
const REVIEWS = [
    { name: 'Jasemin A.', quoteKey: 'onboarding.rating_review_0', avatar: require('@/assets/review-images/jasemin.jpeg') },
    { name: 'John Lee', quoteKey: 'onboarding.rating_review_1', avatar: require('@/assets/review-images/john.jpeg') },
    { name: 'Azim K.', quoteKey: 'onboarding.rating_review_2', avatar: require('@/assets/review-images/azim.jpeg') },
] as const;


function Stars({ size }: { size: number }) {
    return (
        <View style={styles.stars}>
            {Array.from({ length: 5 }, (_, i) => (
                <Ionicons key={i} name="star" size={size} color={STAR_YELLOW} />
            ))}
        </View>
    );
}

/**
 * Kulisse für den nativen Review-Prompt: Rating-Badge + echte App-Store-
 * Reviews im Hintergrund, während das System-Popup darüber erscheint.
 */
export function RatingStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // Kurz verzögert, damit die Kulisse erst sichtbar aufbaut
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (await StoreReview.isAvailableAsync()) {
                await StoreReview.requestReview();
            }
        }, 900);
        return () => clearTimeout(timer);
    }, []);

    return (
        <StepScaffold title={t('onboarding.rating_title')}>
            {/* ── Rating-Badge mit Lorbeerkranz ── */}
            <Animated.View
                entering={FadeInDown.delay(240).duration(500).springify()}
                style={[styles.badge, { backgroundColor: theme.surface }]}
            >
                <LaurelLeft width={34} height={70} color={STAR_YELLOW} />
                <View style={styles.badgeCenter}>
                    <View style={styles.ratingRow}>
                        <JempText type="h2" color={theme.text} style={styles.ratingNumber}>{RATING}</JempText>
                        <Stars size={16} />
                    </View>
                    <JempText type="caption" color={theme.textMuted}>
                        {t('onboarding.rating_badge')}
                    </JempText>
                </View>
                <LaurelRight width={34} height={70} color={STAR_YELLOW} />
            </Animated.View>

            {/* ── Zwischenzeile ── */}
            <Animated.View entering={FadeInDown.delay(340).duration(500).springify()}>
                <JempText type="body-l" color={theme.text} style={styles.socialLine}>
                    {t('onboarding.rating_social')}
                </JempText>
            </Animated.View>

            {/* ── Echte Reviews ── */}
            <View style={styles.reviews}>
                {REVIEWS.map((review, i) => (
                    <Animated.View
                        key={review.name}
                        entering={FadeInDown.delay(400 + i * 140).duration(500).springify()}
                        style={[styles.card, { backgroundColor: theme.surface }]}
                    >
                        <View style={styles.cardHeader}>
                            <Image source={review.avatar} style={styles.avatar} contentFit="cover" />
                            <JempText type="body-sm" color={theme.text} style={styles.cardName}>
                                {review.name}
                            </JempText>
                            <Stars size={11} />
                        </View>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.cardQuote} numberOfLines={3}>
                            {t(review.quoteKey as any)}
                        </JempText>
                    </Animated.View>
                ))}
            </View>
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 100,
        marginBottom: 24,
    },
    badgeCenter: {
        alignItems: 'center',
        gap: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ratingNumber: {
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    stars: {
        flexDirection: 'row',
        gap: 2,
    },
    socialLine: {
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 20,
    },
    reviews: {
        gap: 10,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardName: {
        flex: 1,
        fontWeight: '600',
    },
    cardQuote: {
        lineHeight: 20,
    },
});
