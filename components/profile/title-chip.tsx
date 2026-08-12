import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { tierForScore } from '@/constants/tiers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type TitleChipProps = {
    score: number | null;   // overall 1-100 level, null = no completed assessments
    onPress: () => void;
};

/** Glass pill showing the user's tier title; empty state prompts to earn one. */
export function TitleChip({ score, onPress }: TitleChipProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const tier = score !== null ? tierForScore(score) : null;
    const color = tier?.color ?? theme.textMuted;

    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <View style={[styles.chip, { borderColor: color, backgroundColor: theme.surface }]}>
                <Ionicons
                    name={tier?.slug === 'apex' ? 'trophy' : 'ribbon'}
                    size={13}
                    color={color}
                />
                <JempText type="caption" color={color} style={styles.text}>
                    {(tier ? t(tier.i18nKey) : t('achievements.earn_title')).toUpperCase()}
                </JempText>
                {score !== null && (
                    <JempText type="caption" color={theme.textMuted} style={styles.score}>
                        {score}
                    </JempText>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    text: { letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
    score: { fontSize: 11, fontWeight: '600' },
});
