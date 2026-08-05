import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

const DESTRUCTIVE = '#ef4444';

/**
 * JEMP-Confirm-Dialog im Stil des Generate-Confirm aus plan.tsx: zentrierte
 * Surface-Karte, Gradient-Confirm (bzw. Rot-Tint bei destructive), Abbrechen
 * als Link darunter und per Backdrop-Tap.
 */
export function ConfirmDialog({ visible, title, message, confirmLabel, destructive, showCancel = true, onConfirm, onClose }: {
    visible: boolean;
    title: string;
    message?: string;
    confirmLabel: string;
    destructive?: boolean;
    /** false für reine Info-Dialoge — nur der Confirm-Button, kein Abbrechen-Link */
    showCancel?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable onPress={(e) => e.stopPropagation()} style={styles.cardWrap}>
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                        <JempText type="h2" style={styles.centerText}>{title}</JempText>
                        {message ? (
                            <JempText type="body-l" color={theme.textMuted} style={styles.centerText}>
                                {message}
                            </JempText>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
                            onPress={onConfirm}
                        >
                            {destructive ? (
                                <JempText type="button" color={DESTRUCTIVE}>{confirmLabel}</JempText>
                            ) : (
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.confirmBtnGradient}
                                >
                                    <JempText type="button" color="#fff">{confirmLabel}</JempText>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        {showCancel && (
                            <Pressable onPress={onClose} style={styles.cancelLink} hitSlop={8}>
                                <JempText type="body-sm" color={theme.textMuted}>{t('ui.cancel')}</JempText>
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    cardWrap: {
        width: '100%',
    },
    card: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    centerText: {
        textAlign: 'center',
    },
    confirmBtn: {
        borderRadius: 100,
        overflow: 'hidden',
        width: '100%',
        marginTop: 8,
    },
    confirmBtnDestructive: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        paddingVertical: 16,
        alignItems: 'center',
    },
    confirmBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelLink: {
        paddingVertical: 4,
    },
});
