import { CATEGORY_SVG_ICONS } from "@/constants/category-icons";
import { MODE_COLORS } from "@/constants/theme";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { JempText } from "../jemp-text";

/** Dark glass chip for meta info on top of session card photos */
export function SessionChip({ icon, label }: { icon?: ReactNode; label: string }) {
    return (
        <View style={styles.chip}>
            {icon}
            <JempText type="caption" color="rgba(255,255,255,0.75)">{label}</JempText>
        </View>
    );
}

/** Session mode as glass chip with the mode color as dot */
export function ModeChip({ mode }: { mode: string | null | undefined }) {
    const { t } = useTranslation();
    if (!mode) return null;
    const color = MODE_COLORS[mode] ?? '#8c8c8c';
    return (
        <SessionChip
            icon={<View style={[styles.dot, { backgroundColor: color }]} />}
            label={t(`session_mode.${mode}` as never)}
        />
    );
}

/** Focused category as glass chip with the tintable category SVG icon */
export function CategoryChip({ slug }: { slug: string }) {
    const { t } = useTranslation();
    const Icon = CATEGORY_SVG_ICONS[slug];
    return (
        <SessionChip
            icon={Icon ? <Icon width={12} height={12} color="rgba(255,255,255,0.8)" /> : undefined}
            label={t(`category.${slug}_short` as never)}
        />
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 100, borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)',
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
});
