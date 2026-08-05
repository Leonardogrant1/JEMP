import { DayVariant, RestDayCard } from '@/components/rest-day-card';
import { useTabBarInset } from '@/components/tab-bar';
import { PlanCompletedHomeCard } from '@/components/today-session/PlanCompletedHomeCard';
import { PlanGenerating } from '@/components/today-session/PlanGenerating';
import { TodayScreenHeader } from '@/components/today-session/TodayScreenHeader';
import { TodaysSessionCta, TodaysSessionHero } from '@/components/today-session/TodaysSessionCard';
import { SessionPager } from '@/components/plan/SessionPager';
import { Colors } from '@/constants/theme';
import { toDateStr } from '@/helpers/date-helpers';
import { getDayVariant, getNextScheduledSession, getTodaySessions } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlan } from '@/providers/plan-provider';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';



export default function HomeScreen() {
    const { profile } = useCurrentUser();
    const { plan, sessions } = usePlan();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const todaySessions = useMemo(() => getTodaySessions(sessions), [sessions]);
    const nextScheduledSession = useMemo(
        () => (todaySessions.length > 0 ? null : getNextScheduledSession(sessions)),
        [todaySessions, sessions],
    );

    const todayVariant = useMemo((): DayVariant => {
        return getDayVariant(new Date(), profile?.weekly_schedule, profile?.sport?.slug);
    }, [profile]);

    const { isGenerating } = usePlanGenerationStore();
    const tabBarInset = useTabBarInset();

    // Same condition as the plan tab: past the end date no sessions exist,
    // so point to the plan tab's completion state instead of a rest day
    const planExpired = !!plan?.end_date && plan.end_date < toDateStr(new Date());


    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {isGenerating ? <PlanGenerating /> :
                <View style={[styles.content, { paddingBottom: tabBarInset }]}>

                    {/* ── Header ── */}
                    <TodayScreenHeader />

                    {planExpired ? (
                        <PlanCompletedHomeCard />
                    ) : todaySessions.length > 0 ? (
                        <SessionPager
                            sessions={todaySessions}
                            theme={theme}
                            renderCard={(s) => <TodaysSessionHero session={s} />}
                            renderActions={(s) => <TodaysSessionCta session={s} />}
                        />
                    ) : (
                        <RestDayCard
                            variant={todayVariant}
                            sport={profile?.sport}
                            nextSessionDate={nextScheduledSession ? new Date(nextScheduledSession.scheduled_at!) : undefined}
                        />
                    )}

                </View>}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 20,
    },
});
