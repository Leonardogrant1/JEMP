import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

const STAGE_THRESHOLDS = [0, 12, 72, 88] as const;
const FEATURE_KEYS = [
    'plan.feature_weekly_plan',
    'plan.feature_exercises',
    'plan.feature_assessments',
    'plan.feature_tracking',
] as const;

const ITEM_START_DELAY_MS = 400;
const ITEM_STAGGER_MS = 500;

function getTickIncrement(progress: number): number {
    if (progress < 12) return 1.5;
    if (progress < 72) return 0.4;
    if (progress < 88) return 0.8;
    return 0.15;
}

interface Props {
    error: string | null;
    isComplete?: boolean;
    onRetry: () => void;
    onClose: () => void;
    onAnimationComplete?: () => void;
}

export function GeneratingView({ error, isComplete, onRetry, onClose, onAnimationComplete }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const STAGES = [
        { threshold: STAGE_THRESHOLDS[0], label: t('plan.stage_loading_profile') },
        { threshold: STAGE_THRESHOLDS[1], label: t('plan.stage_generating') },
        { threshold: STAGE_THRESHOLDS[2], label: t('plan.stage_creating_week') },
        { threshold: STAGE_THRESHOLDS[3], label: t('plan.stage_scheduling') },
    ];

    function getStageLabel(p: number): string {
        let label = STAGES[0].label;
        for (const s of STAGES) {
            if (p >= s.threshold) label = s.label;
        }
        return label;
    }

    // One pair of animated values per feature
    const itemAnims = useRef(
        FEATURE_KEYS.map(() => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(10),
        }))
    ).current;

    // Progress tick
    useEffect(() => {
        if (error) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 96) return prev;
                return Math.min(96, prev + getTickIncrement(prev));
            });
        }, 300);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [error]);

    // When HTTP call is done: stop slow tick, sprint to 100%
    useEffect(() => {
        if (!isComplete) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        const sprint = setInterval(() => {
            setProgress(prev => Math.min(100, prev + 4));
        }, 16);
        return () => clearInterval(sprint);
    }, [isComplete]);

    // Notify parent once 100% is reached
    useEffect(() => {
        if (progress >= 100) {
            onAnimationComplete?.();
        }
    }, [progress]);

    // Staggered pop-in on mount
    useEffect(() => {
        itemAnims.forEach(({ opacity, translateY }, i) => {
            const delay = ITEM_START_DELAY_MS + i * ITEM_STAGGER_MS;
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 380,
                    delay,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 380,
                    delay,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, []);

    if (error) {
        return (
            <View style={styles.center}>
                <View style={[styles.errorIconBox, { backgroundColor: '#ef444418' }]}>
                    <Ionicons name="close-circle-outline" size={52} color="#ef4444" />
                </View>
                <JempText type="h2" color={theme.text} style={styles.textCenter}>
                    {t('plan.error_title')}
                </JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.textCenter}>
                    {error}
                </JempText>
                <View style={styles.errorActions}>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.surface }]}
                        onPress={onRetry}
                        activeOpacity={0.7}
                    >
                        <JempText type="body-l" color={theme.text}>{t('ui.retry')}</JempText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <JempText type="caption" color={theme.textMuted}>{t('ui.close')}</JempText>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.center}>
            {/* Percentage */}
            <JempText type="h1" style={[styles.percentage, { color: theme.text }]}>
                {Math.round(progress)}%
            </JempText>

            {/* Title */}
            <JempText type="h2" color={theme.text} style={styles.title}>
                {t('plan.generating_title')}
            </JempText>

            {/* Progress Bar */}
            <View style={[styles.barTrack, { backgroundColor: theme.surface }]}>
                <View style={[styles.barFill, { width: `${progress}%` as any }]}>
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            </View>

            {/* Stage label */}
            <JempText type="caption" color={theme.textMuted}>
                {getStageLabel(progress)}
            </JempText>

            {/* Feature list */}
            <View style={styles.featureList}>
                <JempText type="body-l" color={theme.text} style={styles.featureHeader}>
                    {t('plan.features_header')}
                </JempText>
                {FEATURE_KEYS.map((key, i) => (
                    <Animated.View
                        key={key}
                        style={[
                            styles.featureRow,
                            {
                                opacity: itemAnims[i].opacity,
                                transform: [{ translateY: itemAnims[i].translateY }],
                            },
                        ]}
                    >
                        <JempText type="body-sm" color={theme.textMuted}>·  {t(key)}</JempText>
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },

    // Loading state
    percentage: {
        fontSize: 64,
        fontWeight: '700',
        lineHeight: 72,
        textAlign: 'center',
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
    },
    barTrack: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    featureList: {
        alignSelf: 'flex-start',
        width: '100%',
        marginTop: 38,
        gap: 6,
    },
    featureHeader: {
        fontWeight: '600',
        marginBottom: 4,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textCenter: {
        textAlign: 'center',
    },

    // Error state
    errorIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    errorActions: { gap: 16, alignItems: 'center', marginTop: 8 },
    retryBtn: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
});
