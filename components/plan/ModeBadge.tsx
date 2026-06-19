import { MODE_COLORS } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

export function ModeBadge({ mode }: { mode: string | null | undefined }) {
    const { t } = useTranslation();
    if (!mode) return null;
    const color = MODE_COLORS[mode] ?? '#8c8c8c';
    return (
        <View style={[styles.modeBadge, { backgroundColor: `${color}33`, borderColor: `${color}55` }]}>
            <JempText type="caption" color={color}>{t(`session_mode.${mode}`)}</JempText>
        </View>
    );
}

const styles = StyleSheet.create({

    modeBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    }
});