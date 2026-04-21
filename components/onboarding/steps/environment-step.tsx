import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';

type EnvItem = { id: string; slug: string; label: string; description: string };

const ENV_META: Record<string, { label: string; description: string }> = {
    gym: { label: 'Fitnessstudio', description: 'Vollständige Ausstattung' },
    outdoor: { label: 'Outdoor', description: 'Parks, Sportplätze' },
    home: { label: 'Zuhause', description: 'Heimtraining' },
};

export function EnvironmentStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        supabase.from('environments').select('id, slug').then(({ data }) => {
            if (data) {
                setEnvironments(
                    data.map((e) => ({
                        id: e.id,
                        slug: e.slug,
                        label: ENV_META[e.slug]?.label ?? e.slug,
                        description: ENV_META[e.slug]?.description ?? '',
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
                            {env.label}
                        </Text>
                        <Text style={styles.optionDesc}>{env.description}</Text>
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
