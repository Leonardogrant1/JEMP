import { DayVariant, RestDayCard } from '@/components/rest-day-card';
import { PlanGenerating } from '@/components/today-session/PlanGenerating';
import { TodayScreenHeader } from '@/components/today-session/TodayScreenHeader';
import { TodaysSessionCard } from '@/components/today-session/TodaysSessionCard';
import { Colors } from '@/constants/theme';
import { getDayVariant, getNextScheduledSession, getTodaySession } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlan } from '@/providers/plan-provider';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function HomeScreen() {
    const { profile } = useCurrentUser();
    const { sessions } = usePlan();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const nextSession = useMemo(() => getTodaySession(sessions), [sessions]);
    const nextScheduledSession = useMemo(
        () => (nextSession ? null : getNextScheduledSession(sessions)),
        [nextSession, sessions],
    );

    const todayVariant = useMemo((): DayVariant => {
        return getDayVariant(new Date(), profile?.weekly_schedule, profile?.sport?.slug);
    }, [profile]);

    const { isGenerating } = usePlanGenerationStore();


    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {isGenerating ? <PlanGenerating /> :
                <View style={styles.content}>

                    {/* ── Header ── */}
                    <TodayScreenHeader profile={profile} />

                    {nextSession ? (
                        <TodaysSessionCard
                            nextSession={nextSession}
                        />
                    ) : (
                        <RestDayCard
                            variant={todayVariant}
                            nextSessionDate={nextScheduledSession ? new Date(nextScheduledSession.scheduled_at!) : undefined}
                            onViewInPlan={nextScheduledSession ? () => {
                                const dateStr = new Date(nextScheduledSession.scheduled_at!).toISOString().split('T')[0];
                                router.push(`/(tabs)/plan?date=${dateStr}`);
                            } : undefined}
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
