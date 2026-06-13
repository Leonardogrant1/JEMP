import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignOutConfirmScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { signOut } = useAuth();
    const [loading, setLoading] = useState(false);

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    useEffect(() => {
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }, []);

    function goBack() {
        router.back();
    }

    function handleClose() {
        if (loading) return;
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) runOnJS(goBack)();
        });
    }

    async function handleConfirm() {
        setLoading(true);
        try {
            await signOut();
            trackerManager.track('user_logged_out');
        } catch {
            setLoading(false);
            handleClose();
        }
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideValue.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayValue.value }));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            <View style={styles.header}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="log-out-outline" size={22} color={GradientMid} />
                                </View>
                                <TouchableOpacity onPress={handleClose} hitSlop={8} disabled={loading}>
                                    <Ionicons name="close" size={22} color={theme.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.textBlock}>
                                <JempText type="h2" color={theme.text}>{t('ui.sign_out')}</JempText>
                                <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                    {t('ui.sign_out_confirm')}
                                </JempText>
                            </View>

                            <View style={styles.buttons}>
                                <Pressable
                                    style={[styles.cancelBtn, { backgroundColor: theme.borderDivider }]}
                                    onPress={handleClose}
                                    disabled={loading}
                                >
                                    <JempText type="body-l" color={theme.textMuted}>{t('ui.cancel')}</JempText>
                                </Pressable>

                                <TouchableOpacity
                                    style={[styles.confirmBtn, loading && styles.btnDisabled]}
                                    onPress={handleConfirm}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <JempText type="body-l" color="#fff">{t('ui.sign_out')}</JempText>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    backdropPressable: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    content: { paddingTop: 12, paddingHorizontal: 20, gap: 16 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: `${GradientMid}1a`,
        alignItems: 'center', justifyContent: 'center',
    },
    textBlock: { gap: 8 },
    description: { lineHeight: 22 },
    buttons: { gap: 10, marginTop: 4 },
    cancelBtn: {
        borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    },
    confirmBtn: {
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', overflow: 'hidden',
    },
    btnDisabled: { opacity: 0.5 },
});
