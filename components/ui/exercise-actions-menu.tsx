import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useBottomSheetAnimation } from '@/hooks/use-bottom-sheet-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Aktions-Menü einer Übungszeile (⋮-Button): aktuell nur "Übung austauschen",
 * bewusst als Liste gebaut, damit spätere Aktionen (Details, Notiz, …) nur
 * eine Zeile kosten. Optik/Verhalten = session-manage-Sheet (Slide 600→0 +
 * Backdrop-Fade, ActionRow-Rezept, Backdrop-Tap schließt — kein Abbrechen-
 * Link). RN-Modal statt Route, weil das Menü flüchtig ist; Eintritts-
 * Animation darum über onShow (nicht useEffect — react-hooks/immutability).
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

    const { enter, close, sheetStyle, backdropStyle } = useBottomSheetAnimation();

    function handleShow() {
        enter({ reset: true });
    }

    // Symmetrie (Review 20.10., K7): onClose läuft IMMER nach der Raus-
    // Animation — zusätzliche Aktionen hängen nur hintendran. Ein Aufrufer
    // kann so nicht vergessen, das Modal zu schließen.
    function closeThen(action?: () => void) {
        close(() => { onClose(); action?.(); });
    }

    function handleClose() {
        closeThen();
    }

    function handleSwap() {
        closeThen(onSwap);
    }

    return (
        <Modal transparent visible={visible} statusBarTranslucent animationType="none" onShow={handleShow} onRequestClose={handleClose}>
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={styles.backdropPressable} onPress={handleClose}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Reanimated.View style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
                            <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />
                                <View style={styles.actionList}>
                                    <Pressable
                                        style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }, swapDimmed && styles.rowDimmed]}
                                        onPress={handleSwap}
                                    >
                                        <Ionicons name="swap-horizontal" size={22} color={theme.text} />
                                        <JempText type="body-l" color={theme.text}>{t('swap.action')}</JempText>
                                    </Pressable>
                                </View>
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 12,
    },
    rowDimmed: {
        opacity: 0.35,
    },
});
