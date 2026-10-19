import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Aktions-Menü einer Übungszeile (⋯-Button): aktuell nur "Übung austauschen",
 * bewusst als Liste gebaut, damit spätere Aktionen (Details, Notiz, …) nur
 * eine Zeile kosten. Leichtes RN-Modal statt transparentModal-Route — das
 * Menü ist flüchtig und braucht keinen eigenen Navigations-Eintrag.
 */
export function ExerciseActionsMenu({ visible, onClose, onSwap, swapDimmed }: {
    visible: boolean;
    onClose: () => void;
    onSwap: () => void;
    /** Bereits Sätze geloggt: Aktion gedimmt anzeigen — der Tap bleibt
     *  erlaubt, das Swap-Sheet erklärt die Sperre per Toast. */
    swapDimmed?: boolean;
}) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.card, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 8 }]}>
                        <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />
                        <TouchableOpacity
                            style={[styles.actionRow, swapDimmed && styles.actionDimmed]}
                            onPress={() => { onClose(); onSwap(); }}
                        >
                            <Ionicons name="swap-horizontal" size={20} color={theme.text} />
                            <JempText type="body-l" color={theme.text}>{t('swap.action')}</JempText>
                        </TouchableOpacity>
                        <Pressable onPress={onClose} style={styles.cancelLink} hitSlop={8}>
                            <JempText type="body-sm" color={theme.textMuted}>{t('ui.cancel')}</JempText>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    card: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
    },
    actionDimmed: {
        opacity: 0.35,
    },
    cancelLink: {
        alignSelf: 'center',
        paddingVertical: 10,
    },
});
