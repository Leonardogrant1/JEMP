import { Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { JempText } from './jemp-text';
import GameIcon from '@/assets/icons/game.svg';
import FightIcon from '@/assets/icons/fight.svg';
import TournamentIcon from '@/assets/icons/tournament.svg';
import WhistleIcon from '@/assets/icons/whistle.svg';

// ── Icons ─────────────────────────────────────────────────────────────────

function GradientMoonIcon({ size = 42 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 512 512">
            <Defs>
                <SvgLinearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0" stopColor={Cyan[500]} />
                    <Stop offset="1" stopColor={Electric[500]} />
                </SvgLinearGradient>
            </Defs>
            <Path
                d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216z"
                fill="url(#moon-grad)"
            />
        </Svg>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────

export type DayVariant = 'rest' | 'training' | 'game' | 'fight' | 'tournament';

const VARIANT_TITLE: Record<DayVariant, string> = {
    rest:       'ui.rest_day',
    training:   'ui.training_day',
    game:       'ui.game_day',
    fight:      'ui.fight_day',
    tournament: 'ui.tournament_day',
};

function DayIcon({ variant, size = 42 }: { variant: DayVariant; size?: number }) {
    switch (variant) {
        case 'training':   return <WhistleIcon width={size} height={size} />;
        case 'game':       return <GameIcon width={size} height={size} />;
        case 'fight':      return <FightIcon width={size} height={size} />;
        case 'tournament': return <TournamentIcon width={size} height={size} />;
        default:           return <GradientMoonIcon size={size} />;
    }
}

// ── Component ─────────────────────────────────────────────────────────────

type Props = {
    variant?: DayVariant;
    nextSessionDate?: Date;
    nextSessionLabel?: string;
    onViewInPlan?: () => void;
};

export function RestDayCard({ variant = 'rest', nextSessionDate, nextSessionLabel, onViewInPlan }: Props = {}) {
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const dayLabel = nextSessionDate
        ? nextSessionDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
        : null;

    return (
        <View style={styles.root}>
            <DayIcon variant={variant} size={42} />
            <JempText type="body-l" color={theme.textMuted}>{t(VARIANT_TITLE[variant] as any)}</JempText>

            {dayLabel && (
                <>
                    <JempText type="body-sm" color={theme.textMuted} style={styles.nextLabel}>
                        {t('ui.next_session_on', { day: dayLabel })}
                    </JempText>
                    {onViewInPlan && (
                        <Pressable style={styles.cta} onPress={onViewInPlan}>
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                <JempText type="button" color="#fff">
                                    {t('ui.view_in_plan')}
                                </JempText>
                            </LinearGradient>
                        </Pressable>
                    )}
                </>
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
    cta: {
        marginTop: 8,
        borderRadius: 100,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    ctaGradient: {
        height: 40,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
