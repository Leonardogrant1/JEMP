import { JempText } from '@/components/jemp-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeLoadProfile } from '@/lib/load-profile';
import { WeeklyScheduleSession } from '@/types/user-data';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const loadTransition = LinearTransition.duration(250).easing(Easing.out(Easing.cubic));

const LOAD_LEVELS = ['low', 'medium', 'high'] as const;
export const LOAD_COLORS: Record<(typeof LOAD_LEVELS)[number], string> = {
    low: '#22c55e',
    medium: GradientMid,
    high: '#f97316',
};

/**
 * Wochenbelastungs-Anzeige unter der Sport-Wochen-Liste: Level + Score,
 * animierter 3-Segment-Balken in Ampelfarben, Disclaimer bei „Hoch" und
 * ⓘ-Erklär-Dialog. Live aus denselben computeLoadProfile-Daten, die
 * generate()/Onboarding persistieren.
 */
export function WeekLoadSummary({ sessions }: { sessions: WeeklyScheduleSession[] }) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const [showInfo, setShowInfo] = useState(false);

    if (sessions.length === 0) return null;

    const { load_score, load_profile } = computeLoadProfile(sessions);
    const filledSegments = LOAD_LEVELS.indexOf(load_profile) + 1;
    const levelColor = LOAD_COLORS[load_profile];

    return (
        <Reanimated.View entering={FadeIn.duration(200)} layout={loadTransition} style={styles.section}>
            <View style={styles.header}>
                <Pressable onPress={() => setShowInfo(true)} style={styles.labelBtn} hitSlop={10}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        {t('plan.week_load_label')}
                    </JempText>
                    <Ionicons name="information-circle-outline" size={14} color={theme.textSubtle} />
                </Pressable>
                <Reanimated.View key={load_profile} entering={FadeIn.duration(250)} style={styles.value}>
                    <JempText type="caption" color={levelColor} style={styles.level}>
                        {t(`plan.week_load_${load_profile}` as any)}
                    </JempText>
                    <JempText type="caption" color={theme.textSubtle}>
                        · {load_score}
                    </JempText>
                </Reanimated.View>
            </View>
            <View style={styles.bar}>
                {LOAD_LEVELS.map((level, i) => (
                    <View
                        key={level}
                        style={[styles.segment, { backgroundColor: theme.borderStrong }]}
                    >
                        <Reanimated.View
                            layout={loadTransition}
                            style={[
                                styles.fill,
                                { width: i < filledSegments ? '100%' : 0, backgroundColor: levelColor },
                            ]}
                        />
                    </View>
                ))}
            </View>
            {load_profile === 'high' && (
                <Reanimated.View entering={FadeInDown.duration(200)} style={styles.disclaimer}>
                    <JempText type="body-sm" color={LOAD_COLORS.high}>
                        {t('plan.week_load_disclaimer')}
                    </JempText>
                </Reanimated.View>
            )}

            <ConfirmDialog
                visible={showInfo}
                title={t('plan.week_load_label')}
                message={t('plan.week_load_info_body')}
                confirmLabel={t('ui.got_it')}
                showCancel={false}
                onConfirm={() => setShowInfo(false)}
                onClose={() => setShowInfo(false)}
            />
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 28,
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    label: {
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    value: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    level: {
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    bar: {
        flexDirection: 'row',
        gap: 4,
    },
    segment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
    },
    disclaimer: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(249, 115, 22, 0.12)',
        marginTop: 2,
    },
});
