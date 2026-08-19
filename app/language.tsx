import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveLanguageLocally, type AppLanguage } from '@/i18n';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LANGUAGES = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
] as const;

export default function LanguageScreen() {
    const { i18n } = useTranslation();
    const { session } = useAuth();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const translateY = useSharedValue(400);
    const overlayOpacity = useSharedValue(0);

    // Eintritts-Animation über onLayout statt useEffect — die Lint-Regel
    // react-hooks/immutability verbietet Shared-Value-Mutation im useEffect
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayOpacity.value = withTiming(1, { duration: 250 });
        translateY.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function handleClose() {
        overlayOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(400, { duration: 200 }, (finished) => {
            if (finished) runOnJS(goBack)();
        });
    }

    async function handleSelect(code: string) {
        const lang = code as AppLanguage;
        i18n.changeLanguage(lang);
        await saveLanguageLocally(lang);
        if (session?.user?.id) {
            supabase.from('user_profiles').update({ preferred_language: lang }).eq('id', session.user.id).then(() => {});
        }
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            <View style={styles.list}>
                                {LANGUAGES.map((lang, index) => {
                                    const active = i18n.language === lang.code;
                                    return (
                                        <View key={lang.code}>
                                            {index > 0 && (
                                                <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                            )}
                                            <Pressable
                                                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                                                onPress={() => handleSelect(lang.code)}
                                            >
                                                <JempText type="body-l" style={styles.flag}>{lang.flag}</JempText>
                                                <JempText type="body-l" color={theme.text} style={styles.rowLabel}>
                                                    {lang.label}
                                                </JempText>
                                                {active && <Ionicons name="checkmark" size={20} color={GradientMid} />}
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    list: {
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 12,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        // Einzug auf Texthöhe: row-padding 4 + Flagge 24 + gap 14
        marginLeft: 42,
    },
    flag: {
        fontSize: 22,
        lineHeight: 28,
        width: 24,
        textAlign: 'center',
    },
    rowLabel: {
        flex: 1,
    },
});
