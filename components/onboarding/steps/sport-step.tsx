import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function SportStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedSlug = useOnboardingStore((s) => s.sport_slug);
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<string | null>(storedSlug);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (storedSlug) setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function select(slug: string) {
        setSelected(slug);
        const { data } = await supabase.from('sports').select('id').eq('slug', slug).single();
        if (data) {
            setStore({ sport_id: data.id, sport_slug: slug });
            setCanContinue(true);
        }
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
            {SPORT_GROUPS.map((group, i) => (
                <Animated.View key={group.titleKey} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={styles.group}>
                    <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                        {t(group.titleKey as any).toUpperCase()}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {group.sports.map((sport) => (
                            <SelectableChip
                                key={sport.slug}
                                label={getSportLabelI18n(sport.slug, t) ?? sport.slug}
                                selected={selected === sport.slug}
                                onPress={() => select(sport.slug)}
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
