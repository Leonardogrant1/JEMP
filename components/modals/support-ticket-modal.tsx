import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    visible: boolean;
    onClose: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function SupportTicketModal({ visible, onClose }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Status>('idle');

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            overlayValue.value = withTiming(1, { duration: 250 });
            slideValue.value = withTiming(0, { duration: 300 });
        } else {
            overlayValue.value = withTiming(0, { duration: 200 });
            slideValue.value = withTiming(600, { duration: 200 });
        }
    }, [visible]);

    function handleClose() {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) {
                runOnJS(onClose)();
                runOnJS(resetForm)();
            }
        });
    }

    function resetForm() {
        setTimeout(() => {
            setTitle('');
            setDescription('');
            setStatus('idle');
        }, 100);
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    async function handleSubmit() {
        if (!title.trim() || !description.trim()) return;
        setStatus('loading');
        try {
            const res = await fetch('https://northbyte.studio/api/tickets/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    userId: profile?.id,
                    appSlug: 'jemp',
                }),
            });
            setStatus(res.ok ? 'success' : 'error');
        } catch {
            setStatus('error');
        }
    }

    const canSubmit = title.trim().length > 0 && description.trim().length > 0 && status === 'idle';

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={styles.backdropPressable} onPress={handleClose}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Reanimated.View
                            style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                        >
                            <KeyboardAwareScrollView
                                bounces={false}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                bottomOffset={24}
                            >
                                <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                                    <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                    {/* Header */}
                                    <View style={styles.header}>
                                        <JempText type="h2" color={theme.text}>
                                            {t('ui.support_ticket')}
                                        </JempText>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    {status === 'success' ? (
                                        <View style={styles.successState}>
                                            <Ionicons name="checkmark-circle" size={52} color={Cyan[500]} />
                                            <JempText type="h2" color={theme.text} style={styles.successTitle}>
                                                {t('ui.support_success_title')}
                                            </JempText>
                                            <JempText type="caption" color={theme.textMuted} style={styles.successSubtitle}>
                                                {t('ui.support_success_subtitle')}
                                            </JempText>
                                            <TouchableOpacity
                                                style={styles.submitButton}
                                                onPress={handleClose}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={[Cyan[500], Electric[500]]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <JempText type="body-l" color="#fff">{t('ui.support_close')}</JempText>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={styles.field}>
                                                <JempText type="caption" color={theme.textMuted}>
                                                    {t('ui.support_field_title')}
                                                </JempText>
                                                <JempInput
                                                    variant="outlined"
                                                    value={title}
                                                    onChangeText={setTitle}
                                                    placeholder={t('ui.support_field_title_placeholder')}
                                                    editable={status === 'idle'}
                                                />
                                            </View>

                                            <View style={styles.field}>
                                                <JempText type="caption" color={theme.textMuted}>
                                                    {t('ui.support_field_description')}
                                                </JempText>
                                                <JempInput
                                                    variant="outlined"
                                                    value={description}
                                                    onChangeText={setDescription}
                                                    placeholder={t('ui.support_field_description_placeholder')}
                                                    multiline
                                                    numberOfLines={4}
                                                    textAlignVertical="top"
                                                    editable={status === 'idle'}
                                                    style={styles.inputMultiline}
                                                />
                                            </View>

                                            {status === 'error' && (
                                                <JempText type="caption" color="#ef4444" style={styles.errorText}>
                                                    {t('ui.support_error')}
                                                </JempText>
                                            )}

                                            <TouchableOpacity
                                                style={[
                                                    styles.submitButton,
                                                    !canSubmit && styles.submitButtonDisabled,
                                                ]}
                                                onPress={handleSubmit}
                                                disabled={!canSubmit}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={[Cyan[500], Electric[500]]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                {status === 'loading' ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <JempText type="body-l" color="#fff">{t('ui.support_submit')}</JempText>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </KeyboardAwareScrollView>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
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
    field: {
        gap: 6,
    },
    inputMultiline: {
        height: 110,
        paddingTop: 12,
    },
    errorText: {
        marginTop: -8,
    },
    submitButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        width: '100%',
        overflow: 'hidden',
    },
    submitButtonDisabled: {
        opacity: 0.35,
    },
    successState: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    successTitle: {
        marginTop: 4,
    },
    successSubtitle: {
        textAlign: 'center',
        lineHeight: 20,
    },
});
