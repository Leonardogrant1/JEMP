import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SprintContextForm } from '@/components/pillars/sprint-context-form';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function SprintContextStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const club = useOnboardingStore((s) => s.sprints_covered_by_club);
    const distance = useOnboardingStore((s) => s.sprint_distance);
    const clubAnswered = useOnboardingStore((s) => s.sprintClubAnswered);
    const setStore = useOnboardingStore((s) => s.set);

    useEffect(() => {
        setCanContinue(clubAnswered && distance !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubAnswered, distance]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('sprint_context.title')}</JempText>
            </Animated.View>
            <SprintContextForm
                club={club ?? false}
                clubAnswered={clubAnswered}
                distance={distance}
                onClub={(v) => setStore({ sprints_covered_by_club: v, sprintClubAnswered: true })}
                onDistance={(v) => setStore({ sprint_distance: v })}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
    title: { marginBottom: 24 },
});
