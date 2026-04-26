import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';

type EnvItem = { id: string; slug: string; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null };

export function EnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const { i18n } = useTranslation();
    const locale = i18n.language;
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

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
            if (next.has(env.id)) {
                next.delete(env.id);
            } else {
                next.add(env.id);
            }
            const ids = Array.from(next);
            setStore({ environmentIds: ids });
            setCanContinue(ids.length > 0);
            return next;
        });
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Wo trainierst du?</Text>
            <Text style={styles.subtitle}>Du kannst mehrere Umgebungen auswählen.</Text>
            <View style={styles.list}>
                {environments.map((env) => (
                    <TouchableOpacity
                        key={env.id}
                        style={[styles.option, selected.has(env.id) && styles.optionSelected]}
                        onPress={() => toggle(env)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.optionTitle, selected.has(env.id) && styles.optionTitleSelected]}>
                            {env.name_i18n?.[locale] ?? env.slug}
                        </Text>
                        <Text style={styles.optionDesc}>{env.description_i18n?.[locale] ?? ''}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 28 },
    list: { gap: 12 },
    option: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    optionTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '700' },
    optionTitleSelected: { color: 'white' },
    optionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});
