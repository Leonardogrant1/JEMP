import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { SelectableRow } from '@/components/ui/selectable-row';
import { ENV_ICONS } from '@/constants/environment-icons';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type EnvItem = { id: string; slug: string; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null };

export function EnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const storedEnvIds = useOnboardingStore((s) => s.environmentIds);
    const setStore = useOnboardingStore((s) => s.set);
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(storedEnvIds));
    useEffect(() => {
        if (storedEnvIds.length > 0) setCanContinue(true);
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

    // Side-Effects außerhalb des Updaters — React verbietet setState-Aufrufe
    // fremder Komponenten innerhalb der Updater-Funktion
    function toggle(env: EnvItem) {
        const next = new Set(selected);
        next.has(env.id) ? next.delete(env.id) : next.add(env.id);
        setSelected(next);
        const ids = Array.from(next);
        setStore({ environmentIds: ids });
        setCanContinue(ids.length > 0);
    }

    return (
        <StepScaffold title={t('onboarding.environment_title')} subtitle={t('onboarding.environment_subtitle')} centerContent>
            <View style={styles.list}>
                {environments.map((env, i) => (
                    <Animated.View key={env.id} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()}>
                        <SelectableRow
                            label={env.name_i18n?.[locale] ?? env.slug}
                            description={env.description_i18n?.[locale] ?? undefined}
                            icon={ENV_ICONS[env.slug] ?? 'location-outline'}
                            size="lg"
                            selected={selected.has(env.id)}
                            onPress={() => toggle(env)}
                        />
                    </Animated.View>
                ))}
            </View>
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    list: { gap: 10 },
});
