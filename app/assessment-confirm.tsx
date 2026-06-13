import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useModalResultStore } from '@/stores/modal-result-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AssessmentConfirmScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();

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
            if (finished) runOnJS(goBack)();
        });
    }

    function handleConfirm() {
        useModalResultStore.getState().setAssessmentConfirmed(true);
        handleClose();
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

                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="warning-outline" size={22} color="#f59e0b" />
                                </View>
                                <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                    <Ionicons name="close" size={22} color={theme.textMuted} />
                                </TouchableOpacity>
                            </View>

                            {/* Title + body */}
                            <View style={styles.textBlock}>
                                <JempText type="h2" color={theme.text}>
                                    {t('ui.assessment_confirm_title')}
                                </JempText>
                                <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                    {t('ui.assessment_confirm_body')}
                                </JempText>
                            </View>

                            {/* Buttons */}
                            <View style={styles.buttons}>
                                <Pressable
                                    style={[styles.cancelBtn, { backgroundColor: theme.surface }]}
                                    onPress={handleClose}
                                >
                                    <JempText type="body-l" color={theme.textMuted}>
                                        {t('ui.assessment_confirm_cancel')}
                                    </JempText>
                                </Pressable>

                                <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.confirmBtnGradient}
                                    >
                                        <JempText type="body-l" color="#fff">
                                            {t('ui.assessment_confirm_submit')}
                                        </JempText>
                                    </LinearGradient>
                                </Pressable>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(245,158,11,0.12)',
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
    },
    confirmBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    confirmBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
