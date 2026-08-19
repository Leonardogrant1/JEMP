import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    Easing,
    FadeInDown,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const DESTRUCTIVE = '#ef4444';

function ActionRow({ icon, label, destructive, theme, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    destructive?: boolean;
    theme: (typeof Colors)['light'];
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
            onPress={onPress}
        >
            <Ionicons name={icon} size={22} color={destructive ? DESTRUCTIVE : theme.text} />
            <JempText type="body-l" color={destructive ? DESTRUCTIVE : theme.text}>
                {label}
            </JempText>
        </Pressable>
    );
}

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

    // Eintritts-Animation über onLayout statt useEffect — die Lint-Regel
    // react-hooks/immutability verbietet Shared-Value-Mutation im useEffect
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function closeThen(action: () => void) {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(action);
        });
    }

    function handleClose() {
        closeThen(goBack);
    }

    function handleConfirmCancel() {
        updateSessionStatus(
            { sessionId, status: 'cancelled' },
            { onSuccess: () => useToastStore.getState().show(t('ui.session_cancelled_toast')) },
        );
        handleClose();
    }

    function navigateToReschedule() {
        router.replace({ pathname: '/session-reschedule', params: { sessionId } });
    }

    function navigateToRestAdjust() {
        router.replace({ pathname: '/session-rest-adjust', params: { sessionId } });
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
                        onLayout={handleSheetLayout}
                        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            {confirmMode ? (
                                <Reanimated.View
                                    key="confirm"
                                    entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
                                    style={styles.modeBlock}
                                >
                                    <View style={styles.textBlock}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.session_cancel_confirm_title')}
                                        </JempText>
                                        <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                            {t('ui.session_cancel_confirm_body')}
                                        </JempText>
                                    </View>

                                    <View style={styles.actionList}>
                                        <ActionRow
                                            icon="close-circle-outline"
                                            label={t('ui.session_cancel_confirm_submit')}
                                            destructive
                                            theme={theme}
                                            onPress={handleConfirmCancel}
                                        />
                                        <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                        <ActionRow
                                            icon="arrow-back-outline"
                                            label={t('ui.session_cancel_confirm_back')}
                                            theme={theme}
                                            onPress={() => setConfirmMode(false)}
                                        />
                                    </View>
                                </Reanimated.View>
                            ) : (
                                <Reanimated.View
                                    key="actions"
                                    entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
                                    style={styles.actionList}
                                >
                                    <ActionRow
                                        icon="calendar-outline"
                                        label={t('ui.session_manage_reschedule')}
                                        theme={theme}
                                        onPress={() => closeThen(navigateToReschedule)}
                                    />
                                    <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                    <ActionRow
                                        icon="moon-outline"
                                        label={t('ui.session_manage_rest')}
                                        theme={theme}
                                        onPress={() => closeThen(navigateToRestAdjust)}
                                    />
                                    <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                    <ActionRow
                                        icon="close-circle-outline"
                                        label={t('ui.session_manage_cancel')}
                                        destructive
                                        theme={theme}
                                        onPress={() => setConfirmMode(true)}
                                    />
                                </Reanimated.View>
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
    actionList: {
        marginTop: 4,
    },
    modeBlock: {
        gap: 16,
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
        // Einzug auf Texthöhe: row-padding 4 + Icon 22 + gap 14
        marginLeft: 40,
    },
    textBlock: {
        gap: 8,
    },
    description: {
        lineHeight: 22,
    },
});
