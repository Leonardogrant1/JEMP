import { DROPDOWN_OPTIONS } from "@/constants/progress-constants";
import { Colors, Cyan } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { JempText } from "../jemp-text";


interface CategoryDropdownProps {
    selected: string;
    onSelect: (key: string) => void;
}

export function CategoryDropdown({ selected, onSelect }: CategoryDropdownProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);

    const selectedOpt = DROPDOWN_OPTIONS.find(o => o.key === selected)!;
    const selectedLabel = t(selectedOpt.labelKey);

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                style={[styles.dropdownBtn, { backgroundColor: theme.surface }]}
            >
                <JempText type="button" color={theme.text} style={styles.dropdownLabel} numberOfLines={1}>
                    {selectedLabel}
                </JempText>
                <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View
                        style={[styles.modalSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 8 }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: theme.borderStrong }]} />
                        {DROPDOWN_OPTIONS.map(opt => {
                            const label = t(opt.labelKey);
                            const active = opt.key === selected;
                            return (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => { onSelect(opt.key); setOpen(false); }}
                                    style={[styles.modalOption, active && { backgroundColor: theme.borderDivider }]}
                                >
                                    <JempText type="body-l" color={active ? theme.text : theme.textMuted}>
                                        {label}
                                    </JempText>
                                    {active && <Ionicons name="checkmark" size={18} color={Cyan[500]} />}
                                </Pressable>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}


const styles = StyleSheet.create({
    dropdownBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        gap: 6,
    },
    dropdownLabel: { flex: 1 },

    timeToggle: {
        flexDirection: 'row',
        borderRadius: 100,
        overflow: 'hidden',
        padding: 3,
        gap: 2,
    },
    timeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeBtnActive: {},

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 16,
        gap: 2,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    }
});
