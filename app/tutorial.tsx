import { GaugeCard } from '@/components/progress/gauge-card';
import { JempText } from '@/components/jemp-text';
import { OverallCard } from '@/components/progress/overall-card';
import { Cyan, Electric, Neutral } from '@/constants/theme';
import { useTutorialStore } from '@/stores/tutorial-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Plan Mock ────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEK_DATES = [28, 29, 30, 1, 2, 3, 4];

function PlanMock() {
    return (
        <View style={mock.planContainer}>
            <View style={mock.weekStrip}>
                {WEEK_DAYS.map((day, i) => {
                    const isToday = i === 2;
                    return (
                        <View key={day} style={[mock.dayCard, isToday && mock.dayCardToday]}>
                            {isToday && (
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <JempText type="caption" style={[mock.dayName, { color: isToday ? '#fff' : Neutral[8] }]}>
                                {day}
                            </JempText>
                            <JempText type="h2" style={[mock.dayNumber, { color: '#fff' }]}>
                                {WEEK_DATES[i]}
                            </JempText>
                        </View>
                    );
                })}
            </View>

            <View style={mock.sessionCard}>
                <LinearGradient
                    colors={['rgba(20,184,166,0.22)', 'rgba(0,0,0,0.96)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
                <View style={mock.sessionContent}>
                    <JempText type="h1" color="#fff">Kraft & Explosivität</JempText>
                    <View style={mock.sessionMeta}>
                        <JempText type="caption" color={Neutral[6]}>60 min</JempText>
                        <View style={mock.statusBadge}>
                            <JempText type="caption" color={Neutral[7]}>Geplant</JempText>
                        </View>
                    </View>
                    <View style={mock.ctaWrap}>
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={mock.ctaGradient}
                        >
                            <JempText type="button" color="#fff" style={mock.ctaText}>Starten</JempText>
                        </LinearGradient>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Assessments Mock ─────────────────────────────────────────────────────────

const MOCK_GROUPS = [
    { category: 'Kraft', items: ['Kniebeuge 1RM', 'Bankdrücken 1RM'] },
    { category: 'Ausdauer', items: ['3 km Lauf'] },
];

function AssessmentsMock() {
    return (
        <View style={mock.assessContainer}>
            {MOCK_GROUPS.map((group) => (
                <View key={group.category} style={mock.assessGroup}>
                    <JempText type="h2" color={Neutral[1]}>{group.category}</JempText>
                    <View style={mock.assessRows}>
                        {group.items.map((name) => (
                            <View key={name} style={mock.assessRow}>
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={mock.assessDot}
                                />
                                <JempText type="body-l" color={Neutral[6]} style={{ flex: 1 }}>{name}</JempText>
                                <Ionicons name="chevron-forward" size={16} color={Neutral[8]} />
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

// ─── Progress Mock ────────────────────────────────────────────────────────────

function ProgressMock() {
    return (
        <View style={mock.progressContainer}>
            <OverallCard value={74} trend={12} />
            <View style={mock.gaugeRow}>
                <GaugeCard slug="strength" value={68} trend={8} />
                <GaugeCard slug="mobility" value={81} trend={15} />
            </View>
        </View>
    );
}

// ─── Slides ───────────────────────────────────────────────────────────────────

const SLIDES = [
    { Mock: PlanMock, titleKey: 'tutorial.slide1.title', bodyKey: 'tutorial.slide1.body' },
    { Mock: AssessmentsMock, titleKey: 'tutorial.slide2.title', bodyKey: 'tutorial.slide2.body' },
    { Mock: ProgressMock, titleKey: 'tutorial.slide3.title', bodyKey: 'tutorial.slide3.body' },
    { Mock: PlanMock, titleKey: 'tutorial.slide4.title', bodyKey: 'tutorial.slide4.body' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TutorialScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { setHasSeenTutorial } = useTutorialStore();
    const [currentIndex, setCurrentIndex] = useState(0);

    const isLast = currentIndex === SLIDES.length - 1;
    const { Mock, titleKey, bodyKey } = SLIDES[currentIndex];

    function advance() {
        if (isLast) {
            setHasSeenTutorial(true);
            router.replace('/(tabs)');
        } else {
            setCurrentIndex((i) => i + 1);
        }
    }

    return (
        <View style={styles.container}>
            {/* Mock preview */}
            <View style={styles.previewArea}>
                <View style={styles.previewScale}>
                    <Mock />
                </View>
                <LinearGradient
                    colors={['#000000', 'transparent']}
                    style={styles.fadeTop}
                />
                <LinearGradient
                    colors={['transparent', '#000000']}
                    style={styles.fadeBottom}
                />
            </View>

            {/* Slide content */}
            <Animated.View
                key={currentIndex}
                entering={FadeInDown.duration(340)}
                style={[styles.content, { paddingBottom: insets.bottom + 16 }]}
            >
                <JempText type="h1" color="#fff" style={styles.title}>
                    {t(titleKey as any)}
                </JempText>
                <JempText type="body-l" color={Neutral[6]} style={styles.body}>
                    {t(bodyKey as any)}
                </JempText>

                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
                    ))}
                </View>

                <TouchableOpacity style={styles.button} onPress={advance} activeOpacity={0.85}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <JempText type="button" color="#fff" style={styles.buttonText}>
                            {isLast ? t('tutorial.cta_start' as any) : t('tutorial.cta_continue' as any)}
                        </JempText>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    previewArea: {
        flex: 1,
        overflow: 'hidden',
    },
    previewScale: {
        flex: 1,
        transform: [{ scale: 0.93 }],
    },
    fadeTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    fadeBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 140,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 8,
        gap: 14,
    },
    title: {
        letterSpacing: -0.5,
    },
    body: {
        lineHeight: 24,
    },
    dots: {
        flexDirection: 'row',
        gap: 5,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: Neutral[9],
    },
    dotActive: {
        width: 14,
        backgroundColor: Cyan[500],
    },
    button: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 4,
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
    },
});

// ─── Mock Styles ──────────────────────────────────────────────────────────────

const mock = StyleSheet.create({
    // Plan
    planContainer: {
        flex: 1,
        padding: 20,
        gap: 12,
        justifyContent: 'center',
    },
    weekStrip: {
        flexDirection: 'row',
        gap: 4,
    },
    dayCard: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 7,
        alignItems: 'center',
        gap: 2,
        overflow: 'hidden',
        backgroundColor: Neutral[12],
    },
    dayCardToday: {
        overflow: 'hidden',
    },
    dayName: {
        fontSize: 9,
    },
    dayNumber: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '600',
    },
    sessionCard: {
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 200,
        backgroundColor: Neutral[12],
    },
    sessionContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: 8,
    },
    sessionMeta: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    statusBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    ctaWrap: {
        marginTop: 4,
        borderRadius: 100,
        overflow: 'hidden',
    },
    ctaGradient: {
        height: 48,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: {
        fontSize: 16,
    },

    // Assessments
    assessContainer: {
        flex: 1,
        padding: 20,
        gap: 20,
        justifyContent: 'center',
    },
    assessGroup: {
        gap: 8,
    },
    assessRows: {
        gap: 6,
    },
    assessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Neutral[12],
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    assessDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },

    // Progress
    progressContainer: {
        flex: 1,
        padding: 20,
        gap: 12,
        justifyContent: 'center',
    },
    gaugeRow: {
        flexDirection: 'row',
        gap: 12,
    },
});
