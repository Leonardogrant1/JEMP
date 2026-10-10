import { JempText } from '@/components/jemp-text';
import { FlexibleSessionRow } from '@/components/plan/FlexibleSessionRow';
import { Colors } from '@/constants/theme';
import { getWeekDays, toDateStr } from '@/helpers/date-helpers';
import { usePlan } from '@/providers/plan-provider';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
    theme: (typeof Colors)['light'];
};

/**
 * Flexible Wochen-Sessions (Spec 2026-10-09): Instanzen der laufenden Woche,
 * deren Plan-Template ein flexible_window trägt — als To-do-Checkliste.
 * Rendert nichts, wenn die Woche keine flexiblen Sessions hat.
 */
export function FlexibleWeekList({ theme }: Props) {
    const { t } = useTranslation();
    const { sessions, planSessions } = usePlan();

    const flexibleThisWeek = useMemo(() => {
        const planById = new Map(planSessions.map(ps => [ps.id, ps]));
        const todayStr = toDateStr(new Date());
        const weekSet = new Set(getWeekDays(new Date()).map(toDateStr));
        return sessions
            .map(s => ({ session: s, window: s.workout_plan_session_id ? planById.get(s.workout_plan_session_id)?.flexible_window ?? null : null }))
            .filter(({ session: s, window: w }) =>
                !!w && w.length > 0 && !!s.scheduled_at && weekSet.has(toDateStr(new Date(s.scheduled_at)))
                // Heute geplante Instanzen stehen bereits als Hero im Today-Tab
                && toDateStr(new Date(s.scheduled_at)) !== todayStr);
    }, [sessions, planSessions]);

    if (flexibleThisWeek.length === 0) return null;

    return (
        <View style={styles.section}>
            <JempText type="caption" color={theme.textMuted} style={styles.label}>
                {t('plan.flexible_title').toUpperCase()}
            </JempText>
            {flexibleThisWeek.map(({ session: s, window: w }) => (
                <FlexibleSessionRow key={s.id} session={s} window={w!} theme={theme} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { gap: 2 },
    label: { letterSpacing: 1.2, fontSize: 11, marginBottom: 4 },
});
