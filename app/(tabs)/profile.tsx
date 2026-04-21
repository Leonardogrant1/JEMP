import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type GenerateState = 'idle' | 'loading' | 'success' | 'error';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [generateState, setGenerateState] = useState<GenerateState>('idle');

    async function handleGeneratePlan() {
        setGenerateState('loading');
        try {
            const { data, error } = await supabase.functions.invoke('generate-trainings-plan');
            if (error) throw error;
            setGenerateState('success');
            Alert.alert(
                'Plan erstellt ✅',
                `${data.sessions_scheduled} Sessions geplant\n${data.start_date} → ${data.end_date}`,
            );
        } catch (err: any) {
            setGenerateState('error');
            Alert.alert('Fehler', err?.message ?? 'Plan konnte nicht erstellt werden.');
        } finally {
            setGenerateState('idle');
        }
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.content}>
                <JempText type="h1">Profile</JempText>

                <View style={styles.section}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            { backgroundColor: theme.primary },
                            generateState === 'loading' && styles.buttonDisabled,
                        ]}
                        onPress={handleGeneratePlan}
                        disabled={generateState === 'loading'}
                        activeOpacity={0.8}
                    >
                        {generateState === 'loading' ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <JempText type="button" color="#fff">
                                Trainingsplan generieren
                            </JempText>
                        )}
                    </TouchableOpacity>

                    {generateState === 'success' && (
                        <JempText type="caption" color={theme.success} style={styles.statusText}>
                            Plan erfolgreich erstellt
                        </JempText>
                    )}
                    {generateState === 'error' && (
                        <JempText type="caption" color="#ef4444" style={styles.statusText}>
                            Fehler beim Erstellen
                        </JempText>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    section: { marginTop: 32, gap: 8 },
    button: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    statusText: { textAlign: 'center' },
});
