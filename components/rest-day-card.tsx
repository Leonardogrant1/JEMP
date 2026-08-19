import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { JempText } from './jemp-text';
import GameIcon from '@/assets/icons/game.svg';
import { useTrainingAnimation } from '@/hooks/use-training-animation';

// ── Icons ─────────────────────────────────────────────────────────────────

function LottieIcon({ source, size = 56 }: { source: unknown; size?: number }) {
    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const ref = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        ref.current?.reset();
        ref.current?.play();
    }, []));

    return (
        <LottieView
            ref={ref}
            source={source as never}
            loop={false}
            style={{ width: size, height: size }}
        />
    );
}

// ── Types ─────────────────────────────────────────────────────────────────

export type DayVariant = 'rest' | 'training' | 'game' | 'fight' | 'tournament' | 'competition';

const VARIANT_TITLE: Record<DayVariant, string> = {
    rest:        'ui.rest_day',
    training:    'ui.training_day',
    game:        'ui.game_day',
    fight:       'ui.fight_day',
    tournament:  'ui.tournament_day',
    competition: 'ui.competition_day',
};

function DayIcon({ variant, trainingSource, size = 42 }: { variant: DayVariant; trainingSource: unknown; size?: number }) {
    switch (variant) {
        // Lottie-Icons haben eingebautes Padding — deutlich größer, damit es optisch trägt
        case 'training':   return <LottieIcon source={trainingSource} size={size * 2} />;
        case 'game':       return <GameIcon width={size} height={size} />;
        case 'fight':      return <LottieIcon source={require('@/assets/animations/fight.json')} size={size * 2} />;
        case 'tournament':
        case 'competition': return <LottieIcon source={require('@/assets/animations/throphy.json')} size={size * 2} />;
        default:           return <LottieIcon source={require('@/assets/animations/rest.json')} size={size * 2} />;
    }
}

// ── Component ─────────────────────────────────────────────────────────────

type Props = {
    variant?: DayVariant;
    sport?: { animation_storage_path?: string | null; group_name?: string | null } | null;
    nextSessionDate?: Date;
    nextSessionLabel?: string;
};

export function RestDayCard({ variant = 'rest', sport, nextSessionDate, nextSessionLabel }: Props = {}) {
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const trainingAnimation = useTrainingAnimation(sport);

    const dayLabel = nextSessionDate
        ? nextSessionDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
        : null;

    return (
        <View style={styles.root}>
            <DayIcon variant={variant} trainingSource={trainingAnimation} size={42} />
            <JempText type="h2" color={theme.textMuted}>{t(VARIANT_TITLE[variant] as any)}</JempText>

            {dayLabel && (
                <JempText type="body-sm" color={theme.textMuted} style={styles.nextLabel}>
                    {t('ui.next_session_on', { day: dayLabel })}
                </JempText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextLabel: {
        marginTop: 4,
        textAlign: 'center',
    },
});
