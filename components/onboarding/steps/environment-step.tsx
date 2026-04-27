import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableRow } from '@/components/ui/selectable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type EnvItem = { id: string; slug: string; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null };

export function EnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        supabase.from('environments').select('id, slug, name_i18n, description_i18n').then(({ data }) => {
            if (data) {
                setEnvironments(
                    data.map((e) => ({
                        id: e.id,
                        slug: e.slug,
                        name_i18n: e.name_i18n as Record<string, string> | null,
                        description_i18n: e.description_i18n as Record<string, string> | null,
                    }))
                );
            }
        });
    }, []);

    function toggle(env: EnvItem) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(env.id) ? next.delete(env.id) : next.add(env.id);
            const ids = Array.from(next);
            setStore({ environmentIds: ids });
            setCanContinue(ids.length > 0);
            return next;
        });
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.environment_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.environment_subtitle')}
                </JempText>
            </Animated.View>
            <View style={styles.list}>
                {environments.map((env, i) => (
                    <Animated.View key={env.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()}>
                        <SelectableRow
                            label={env.name_i18n?.[locale] ?? env.slug}
                            description={env.description_i18n?.[locale] ?? undefined}
                            selected={selected.has(env.id)}
                            onPress={() => toggle(env)}
                        />
                    </Animated.View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 32,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    list: { gap: 10 },
});
