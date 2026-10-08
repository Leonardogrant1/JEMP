import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type SprintDistance = 'under_20m' | '20_40m' | 'over_40m';
const DISTANCES: SprintDistance[] = ['under_20m', '20_40m', 'over_40m'];

export function SprintContextStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const club = useOnboardingStore((s) => s.sprints_covered_by_club);
    const distance = useOnboardingStore((s) => s.sprint_distance);
    const clubAnswered = useOnboardingStore((s) => s.sprintClubAnswered);
    const setStore = useOnboardingStore((s) => s.set);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        setCanContinue(clubAnswered && distance !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubAnswered, distance]);

    function pickClub(value: boolean) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStore({ sprints_covered_by_club: value, sprintClubAnswered: true });
    }

    function pickDistance(value: SprintDistance) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStore({ sprint_distance: value });
    }

    const card = (selected: boolean) => [
        styles.card,
        selected
            ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
            : { backgroundColor: theme.surface, borderColor: 'transparent' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('sprint_context.title')}</JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.question}>
                    {t('sprint_context.club_question')}
                </JempText>
                <View style={styles.rowPair}>
                    <Pressable onPress={() => pickClub(true)} style={[...card(clubAnswered && club === true), styles.half]}>
                        <JempText type="body-l" color={theme.text}>{t('sprint_context.club_yes')}</JempText>
                    </Pressable>
                    <Pressable onPress={() => pickClub(false)} style={[...card(clubAnswered && club === false), styles.half]}>
                        <JempText type="body-l" color={theme.text}>{t('sprint_context.club_no')}</JempText>
                    </Pressable>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(380).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.question}>
                    {t('sprint_context.distance_question')}
                </JempText>
                <View style={styles.list}>
                    {DISTANCES.map((d) => (
                        <Pressable key={d} onPress={() => pickDistance(d)} style={card(distance === d)}>
                            <JempText type="body-l" color={theme.text}>{t(`sprint_context.distance_${d}`)}</JempText>
                            <JempText type="caption" color={theme.textSubtle}>
                                {t(`sprint_context.distance_${d}_example`)}
                            </JempText>
                        </Pressable>
                    ))}
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
    title: { marginBottom: 24 },
    question: { marginBottom: 12 },
    rowPair: { flexDirection: 'row', gap: 10, marginBottom: 28 },
    half: { flex: 1, alignItems: 'center' },
    list: { gap: 10 },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 4,
    },
});
