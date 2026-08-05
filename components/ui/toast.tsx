import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { Easing, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTO_HIDE_MS = 2500;

/**
 * Globaler Snackbar-Host — einmal im Root-Layout gemountet, gefüttert über
 * useToastStore.show('…'). Erscheint über der Tab-Bar, räumt sich selbst weg.
 */
export function Toast() {
    const message = useToastStore(s => s.message);
    const nonce = useToastStore(s => s.nonce);
    const hide = useToastStore(s => s.hide);
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        if (!message) return;
        // Leichter Tick statt Success-Notification — die bleibt den großen
        // Momenten (Übung/Session fertig) vorbehalten
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const timer = setTimeout(hide, AUTO_HIDE_MS);
        return () => clearTimeout(timer);
    }, [message, nonce, hide]);

    if (!message) return null;

    return (
        <Reanimated.View
            key={nonce}
            entering={FadeInDown.duration(250).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(200)}
            style={[styles.wrap, { bottom: insets.bottom + 96 }]}
            pointerEvents="none"
        >
            <View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.borderDivider }]}>
                <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                <JempText type="body-sm" color={theme.text}>{message}</JempText>
            </View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        maxWidth: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
});
