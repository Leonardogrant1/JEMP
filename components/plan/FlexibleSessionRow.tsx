import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { WorkoutSession } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

/** Datum → ISO-Wochentag (1=Mo … 7=So) */
const toDow = (d: Date) => ((d.getDay() + 6) % 7) + 1;

type Props = {
    session: WorkoutSession;
    /** Erlaubte Wochentage (1–7) aus workout_plan_sessions.flexible_window */
    window: number[];
    theme: (typeof Colors)['light'];
};

/**
 * Flexible Wochen-Session als To-do-Zeile (Spec 2026-10-09): Checkbox-Kreis,
 * Name + Empfehlungstag, rechts "Planen ›". Tap öffnet das Reschedule-Sheet
 * (Tagesauswahl mit Fenster-Sperren und Sprint-Warnungen) — nie ein stilles
 * Verschieben.
 */
export function FlexibleSessionRow({ session, window: allowedDays, theme }: Props) {
    const { t } = useTranslation();
    const router = useRouter();

    const todayDow = toDow(new Date());
    const scheduledDate = new Date(session.scheduled_at!);
    const done = session.status !== 'scheduled';

    // Letzter legaler Tag der laufenden Woche (ab heute) → Dringlichkeits-Zustand
    const remainingLegal = allowedDays.filter((d) => d >= todayDow);
    const lastChance = !done && remainingLegal.length === 1 && remainingLegal[0] === todayDow;

    if (done) {
        return (
            <View style={styles.row}>
                <Ionicons name="checkmark-circle" size={22} color={GradientMid} />
                <JempText type="body-sm" color={theme.textMuted} style={styles.doneText}>
                    {session.name}
                </JempText>
                <JempText type="caption" color={theme.textSubtle}>
                    {t('plan.flexible_done', { day: t(`plan.day_${toDow(scheduledDate)}` as never) })}
                </JempText>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onPress={() => router.push(`/session-reschedule?sessionId=${session.id}`)}
            activeOpacity={0.7}
            style={styles.row}
        >
            <Ionicons name="ellipse-outline" size={22} color={lastChance ? GradientMid : theme.textSubtle} />
            <View style={styles.titleCol}>
                <JempText type="body-sm" color={theme.text}>{session.name}</JempText>
                <JempText type="caption" color={lastChance ? GradientMid : theme.textMuted}>
                    {lastChance
                        ? t('plan.flexible_last_chance')
                        : `${session.estimated_duration_minutes ?? 30} min · ${t('plan.flexible_recommended', { day: t(`plan.day_${toDow(scheduledDate)}` as never) })}`}
                </JempText>
            </View>
            <View style={styles.cta}>
                <JempText type="body-sm" color={GradientMid}>{t('plan.flexible_plan')}</JempText>
                <Ionicons name="chevron-forward" size={14} color={GradientMid} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    titleCol: { flex: 1, gap: 1 },
    doneText: { flex: 1, textDecorationLine: 'line-through' },
    cta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
