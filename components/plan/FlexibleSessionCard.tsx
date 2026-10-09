import { JempText } from '@/components/jemp-text';
import { JempDialog } from '@/components/ui/jemp-dialog';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useRescheduleSession } from '@/mutations/use-reschedule-session';
import { WorkoutSession } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

/** Datum → ISO-Wochentag (1=Mo … 7=So) */
const toDow = (d: Date) => ((d.getDay() + 6) % 7) + 1;
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

type Props = {
    session: WorkoutSession;
    /** Erlaubte Wochentage (1–7) aus workout_plan_sessions.flexible_window */
    window: number[];
    theme: (typeof Colors)['light'];
};

/**
 * Flexible Wochen-Session (Spec 2026-10-09): Sprint/Mobility als To-do mit
 * Empfehlungstag + legalem Fenster. "Starten" verschiebt die Instanz auf heute
 * (bestehende Reschedule-Mutation) und öffnet die Session; außerhalb des
 * Fensters erklärt ein Dialog den Grund (Spieltags-Nähe).
 */
export function FlexibleSessionCard({ session, window: allowedDays, theme }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const reschedule = useRescheduleSession();
    const [showBlocked, setShowBlocked] = useState(false);

    const today = new Date();
    const todayDow = toDow(today);
    const scheduledDate = new Date(session.scheduled_at!);
    const recommendedDow = toDow(scheduledDate);
    const done = session.status !== 'scheduled';

    const categorySlug = session.session_type === 'speed' ? 'sprints' : 'mobility';
    const Icon = CATEGORY_SVG_ICONS[categorySlug];

    // Letzter legaler Tag der laufenden Woche (ab heute) → Dringlichkeits-Zustand
    const remainingLegal = allowedDays.filter((d) => d >= todayDow);
    const lastChance = !done && remainingLegal.length === 1 && remainingLegal[0] === todayDow;

    function handleStart() {
        if (!allowedDays.includes(todayDow)) {
            setShowBlocked(true);
            return;
        }
        const todayStr = toDateStr(today);
        const open = () => router.push(`/session/${session.id}`);
        if (toDateStr(scheduledDate) === todayStr) { open(); return; }
        reschedule.mutate(
            { sessionId: session.id, newDate: todayStr, originalScheduledAt: session.scheduled_at! },
            { onSuccess: open },
        );
    }

    if (done) {
        return (
            <View style={[styles.doneRow, { backgroundColor: theme.surface }]}>
                <Ionicons name="checkmark-circle" size={18} color={GradientMid} />
                <JempText type="body-sm" color={theme.textMuted}>
                    {session.name} · {t(`plan.day_${toDow(scheduledDate)}`)}
                </JempText>
            </View>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor: theme.surface }, lastChance && { borderColor: GradientMid, borderWidth: 1.5 }]}>
            <View style={styles.headerRow}>
                <View style={[styles.iconBox, { backgroundColor: `${GradientMid}18` }]}>
                    {Icon && <Icon width={20} height={20} color={GradientMid} />}
                </View>
                <View style={styles.titleCol}>
                    <JempText type="body-l" color={theme.text}>{session.name}</JempText>
                    <JempText type="caption" color={lastChance ? GradientMid : theme.textMuted}>
                        {lastChance
                            ? t('plan.flexible_last_chance')
                            : `${session.estimated_duration_minutes ?? 30} min · ${t('plan.flexible_recommended', { day: t(`plan.day_${recommendedDow}`) })}`}
                    </JempText>
                </View>
            </View>

            {/* Fenster: legale Tage normal, gesperrte grau + Schloss */}
            <View style={styles.dayRow}>
                {WEEK_DAYS.map(({ dow, key }) => {
                    const allowed = allowedDays.includes(dow);
                    const isRecommended = dow === recommendedDow;
                    return (
                        <View
                            key={dow}
                            style={[
                                styles.dayChip,
                                { borderColor: isRecommended ? GradientMid : theme.borderDivider },
                                !allowed && styles.dayChipBlocked,
                            ]}
                        >
                            <JempText type="caption" color={allowed ? (isRecommended ? GradientMid : theme.text) : theme.textSubtle}>
                                {t(key as never)}
                            </JempText>
                            {!allowed && <Ionicons name="lock-closed" size={8} color={theme.textSubtle} />}
                        </View>
                    );
                })}
            </View>

            <Pressable onPress={handleStart} style={styles.startBtn} disabled={reschedule.isPending}>
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                    <Ionicons name="play" size={16} color="#fff" />
                    <JempText type="button" color="#fff">{t('plan.flexible_start')}</JempText>
                </LinearGradient>
            </Pressable>

            <JempDialog
                visible={showBlocked}
                title={t('plan.flexible_blocked_title')}
                message={t(session.session_type === 'speed' ? 'plan.flexible_blocked_speed' : 'plan.flexible_blocked_generic')}
                buttonLabel={t('ui.got_it')}
                icon="information-circle-outline"
                iconColor={GradientMid}
                onDismiss={() => setShowBlocked(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 16, padding: 14, gap: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    titleCol: { flex: 1, gap: 2 },
    dayRow: { flexDirection: 'row', gap: 6 },
    dayChip: {
        flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 5,
        alignItems: 'center', justifyContent: 'center', gap: 1,
    },
    dayChipBlocked: { opacity: 0.55 },
    startBtn: { borderRadius: 100, overflow: 'hidden' },
    startGradient: { height: 42, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
    doneRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    },
});
