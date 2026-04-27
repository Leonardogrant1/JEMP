import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

const CONFIRM_WORD = 'DELETE';

interface Props {
    visible: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteAccountModal({ visible, loading, onClose, onConfirm }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [input, setInput] = useState('');

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setInput('');
            overlayValue.value = withTiming(1, { duration: 250 });
            slideValue.value = withTiming(0, { duration: 300 });
        } else {
            overlayValue.value = withTiming(0, { duration: 200 });
            slideValue.value = withTiming(600, { duration: 200 });
        }
    }, [visible]);

    function handleClose() {
        if (loading) return;
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) {
                runOnJS(onClose)();
                runOnJS(setInput)('');
            }
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const confirmed = input === CONFIRM_WORD;

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
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="trash-outline" size={22} color="#ef4444" />
                                        </View>
                                        <TouchableOpacity onPress={handleClose} hitSlop={8} disabled={loading}>
                                            <Ionicons name="close" size={22} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Title + description */}
                                    <View style={styles.textBlock}>
                                        <JempText type="h2" color="#ef4444">
                                            {t('ui.delete_account_title')}
                                        </JempText>
                                        <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                            {t('ui.delete_account_message')}
                                        </JempText>
                                    </View>

                                    {/* Confirmation input */}
                                    <View style={styles.field}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.delete_account_type_prompt', { word: CONFIRM_WORD })}
                                        </JempText>
                                        <JempInput
                                            variant="outlined"
                                            value={input}
                                            onChangeText={setInput}
                                            placeholder={CONFIRM_WORD}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            editable={!loading}
                                            style={[
                                                styles.confirmInput,
                                                { borderColor: confirmed ? '#ef4444' : theme.borderDivider },
                                            ]}
                                        />
                                    </View>

                                    {/* Confirm button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.deleteButton,
                                            (!confirmed || loading) && styles.deleteButtonDisabled,
                                        ]}
                                        onPress={onConfirm}
                                        disabled={!confirmed || loading}
                                        activeOpacity={0.8}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <JempText type="body-l" color="#fff">
                                                {t('ui.delete_account_confirm')}
                                            </JempText>
                                        )}
                                    </TouchableOpacity>
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
    field: {
        gap: 8,
    },
    confirmInput: {
        letterSpacing: 2,
        fontWeight: '600',
        borderWidth: 1.5,
    },
    deleteButton: {
        backgroundColor: '#ef4444',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    deleteButtonDisabled: {
        opacity: 0.3,
    },
});
