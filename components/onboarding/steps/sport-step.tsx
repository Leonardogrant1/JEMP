import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const GROUP_TITLE_KEYS: Record<string, string> = {
    combat_sports: 'sport_group.martial_arts',
    team_sports: 'sport_group.team',
    athletics: 'sport_group.athletics',
    strength: 'sport_group.strength',
    endurance: 'sport_group.endurance',
    racket_sports: 'sport_group.racket',
    other: 'sport_group.other',
};

const GROUP_ORDER = ['combat_sports', 'team_sports', 'athletics', 'strength', 'endurance', 'racket_sports', 'other'];

type Sport = { id: string; slug: string; group_name: string; name_i18n: Record<string, string> | null };

export function SportStep() {
    const { t, i18n } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedSlug = useOnboardingStore((s) => s.sport_slug);
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<string | null>(storedSlug);
    const [sports, setSports] = useState<Sport[]>([]);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (storedSlug) setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        supabase
            .from('sports')
            .select('id, slug, group_name, name_i18n')
            .then(({ data }) => {
                if (data) setSports(data as Sport[]);
            });
    }, []);

    const groups = GROUP_ORDER
        .map(groupName => ({
            groupName,
            titleKey: GROUP_TITLE_KEYS[groupName],
            sports: sports.filter(s => s.group_name === groupName),
        }))
        .filter(g => g.sports.length > 0);

    function select(sport: Sport) {
        setSelected(sport.slug);
        setStore({ sport_id: sport.id, sport_slug: sport.slug });
        setCanContinue(true);
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.sport_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.sport_subtitle')}
                </JempText>
            </Animated.View>
            {groups.map((group, i) => (
                <Animated.View key={group.groupName} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={styles.group}>
                    <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                        {t(group.titleKey as any).toUpperCase()}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {group.sports.map((sport) => (
                            <SelectableChip
                                key={sport.slug}
                                label={sport.name_i18n?.[i18n.language] ?? sport.slug}
                                selected={selected === sport.slug}
                                onPress={() => select(sport)}
                            />
                        ))}
                    </View>
                </Animated.View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 28,
    },
    group: {
        marginBottom: 20,
    },
    groupTitle: {
        letterSpacing: 1,
        fontSize: 11,
        marginBottom: 10,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
});
