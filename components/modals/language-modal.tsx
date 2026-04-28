import { JempText } from '@/components/jemp-text';
import { Colors, Cyan } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveLanguageLocally, type AppLanguage } from '@/i18n';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LANGUAGES = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
] as const;

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function LanguageModal({ visible, onClose }: Props) {
    const { i18n, t } = useTranslation();
    const { session } = useAuth();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();

    const translateY = useSharedValue(400);
    const overlayOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            overlayOpacity.value = withTiming(1, { duration: 250 });
            translateY.value = withTiming(0, { duration: 300 });
        } else {
            overlayOpacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(400, { duration: 200 });
        }
    }, [visible]);

    function handleClose() {
        overlayOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(400, { duration: 200 }, (finished) => {
            if (finished) runOnJS(onClose)();
        });
    }

    async function handleSelect(code: string) {
        const lang = code as AppLanguage;
        i18n.changeLanguage(lang);
        await saveLanguageLocally(lang);
        if (session?.user?.id) {
            supabase
                .from('user_profiles')
                .update({ preferred_language: lang })
                .eq('id', session.user.id)
                .then(() => {}); // fire-and-forget
        }
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={styles.backdropPressable} onPress={handleClose}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Reanimated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 12 }]}>
                            <View style={styles.header}>
                                <JempText type="h2">{t('ui.language')}</JempText>
                                <Pressable style={styles.closeButton} onPress={handleClose}>
                                    <Ionicons name="close" size={20} color={theme.background} />
                                </Pressable>
                            </View>
                            <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />

                            <View style={styles.list}>
                                {LANGUAGES.map((lang) => {
                                    const active = i18n.language === lang.code;
                                    return (
                                        <Pressable
                                            key={lang.code}
                                            style={({ pressed }) => [
                                                styles.row,
                                                { backgroundColor: active ? theme.primarySubtle : theme.surface },
                                                pressed && { opacity: 0.7 },
                                            ]}
                                            onPress={() => handleSelect(lang.code)}
                                        >
                                            <JempText type="h2" style={styles.flag}>{lang.flag}</JempText>
                                            <JempText type="body-l" color={theme.text} style={styles.rowLabel}>
                                                {lang.label}
                                            </JempText>
                                            {active && (
                                                <Ionicons name="checkmark" size={20} color={Cyan[400]} />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Reanimated.View>
                    </Pressable>
                </Pressable>
            </Reanimated.View>
        </Modal>
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
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 22,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
    },
    list: {
        padding: 16,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
    },
    flag: {
        fontSize: 24,
        lineHeight: 30,
    },
    rowLabel: {
        flex: 1,
    },
});
