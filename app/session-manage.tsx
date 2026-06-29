import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

export default function SessionManageScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    const { mutate: updateSessionStatus } = useUpdateSessionStatus();

    const [confirmMode, setConfirmMode] = useState(false);

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
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(goBack);
        });
    }

    function handleConfirmCancel() {
        updateSessionStatus({ sessionId, status: 'cancelled' });
        handleClose();
    }

    function navigateToReschedule() {
        router.replace({ pathname: '/session-reschedule', params: { sessionId } });
    }

    function handleReschedule() {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(navigateToReschedule);
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            {confirmMode ? (
                                <>
                                    {/* Confirm cancel header */}
                                    <View style={styles.header}>
                                        <View style={styles.iconCircleRed}>
                                            <Ionicons name="warning-outline" size={22} color="#ef4444" />
                                        </View>
                                        <TouchableOpacity onPress={() => setConfirmMode(false)} hitSlop={8}>
                                            <Ionicons name="arrow-back" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.textBlock}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_cancel_confirm_title')}
                                        </JempText>
                                        <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                            {t('ui.session_cancel_confirm_body')}
                                        </JempText>
                                    </View>

                                    <View style={styles.buttons}>
                                        <Pressable
                                            style={[styles.secondaryBtn, { backgroundColor: theme.surface }]}
                                            onPress={() => setConfirmMode(false)}
                                        >
                                            <JempText type="body-l" color={theme.textMuted}>
                                                {t('ui.cancel')}
                                            </JempText>
                                        </Pressable>
                                        <Pressable
                                            style={styles.destructiveBtn}
                                            onPress={handleConfirmCancel}
                                        >
                                            <JempText type="body-l" color="#ef4444">
                                                {t('ui.session_cancel_confirm_submit')}
                                            </JempText>
                                        </Pressable>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Main actions header */}
                                    <View style={styles.header}>
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
                                        </View>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.textBlock}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_manage_title')}
                                        </JempText>
                                    </View>

                                    <View style={styles.buttons}>
                                        <Pressable
                                            style={styles.cancelBtn}
                                            onPress={() => setConfirmMode(true)}
                                        >
                                            <JempText type="body-l" color="#ef4444">
                                                {t('ui.session_manage_cancel')}
                                            </JempText>
                                        </Pressable>

                                        <Pressable style={styles.rescheduleBtn} onPress={handleReschedule}>
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.rescheduleBtnGradient}
                                            >
                                                <JempText type="body-l" color="#fff">
                                                    {t('ui.session_manage_reschedule')}
                                                </JempText>
                                            </LinearGradient>
                                        </Pressable>
                                    </View>
                                </>
                            )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59,130,246,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleRed: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239,68,68,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: {
        gap: 8,
    },
    description: {
        lineHeight: 22,
    },
    buttons: {
        gap: 10,
        marginTop: 4,
    },
    cancelBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.12)',
    },
    destructiveBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.12)',
    },
    secondaryBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    rescheduleBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    rescheduleBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
