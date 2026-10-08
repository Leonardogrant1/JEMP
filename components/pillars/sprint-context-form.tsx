import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export type SprintDistance = 'under_20m' | '20_40m' | 'over_40m';
const DISTANCES: SprintDistance[] = ['under_20m', '20_40m', 'over_40m'];

type Props = {
    club: boolean;
    clubAnswered: boolean;
    distance: SprintDistance | null;
    onClub: (value: boolean) => void;
    onDistance: (value: SprintDistance) => void;
};

/** Geteiltes Formular (Onboarding + Wizard): Sprint-Kontext (Spec §3.1). */
export function SprintContextForm({ club, clubAnswered, distance, onClub, onDistance }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const card = (selected: boolean) => [
        styles.card,
        selected
            ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
            : { backgroundColor: theme.surface, borderColor: 'transparent' },
    ];

    function pickClub(value: boolean) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClub(value);
    }

    function pickDistance(value: SprintDistance) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDistance(value);
    }

    return (
        <View>
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
        </View>
    );
}

const styles = StyleSheet.create({
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
