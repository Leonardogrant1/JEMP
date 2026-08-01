import { CATEGORY_SVG_ICONS } from "@/constants/category-icons";
import { getCategoryLabelShort } from "@/constants/category-labels";
import { ALL_STAT_SLUGS } from "@/constants/progress-constants";
import { Colors, Cyan } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CategoryHistoryPoint } from "@/queries/use-user-category-history-query";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { Sparkline } from "./sparkline";
import { TrendBadge } from "./trend-badge";


interface CategoryStatGridProps {
    levels: Record<string, number | undefined>;
    trends: Record<string, number | null>;
    history: Record<string, CategoryHistoryPoint[]>;
    selected: string;
    onSelect: (key: string) => void;
}

export function CategoryStatGrid({ levels, trends, history, selected, onSelect }: CategoryStatGridProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = (colorScheme ?? 'dark') === 'dark';
    const theme = Colors[isDark ? 'dark' : 'light'];

    const glassOverlay = isDark ? 'rgba(18, 20, 26, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    const glassBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    return (
        <View style={styles.grid}>
            {ALL_STAT_SLUGS.map((slug, index) => {
                const active = slug === selected;
                const value = levels[slug];
                const trend = trends[slug] ?? null;
                const Icon = CATEGORY_SVG_ICONS[slug];
                return (
                    <Pressable
                        key={slug}
                        onPress={() => onSelect(active ? 'all' : slug)}
                        style={[styles.tile, { borderColor: active ? Cyan[500] : glassBorder }]}
                    >
                        <BlurView
                            intensity={40}
                            tint={isDark ? 'dark' : 'light'}
                            style={[styles.glassFill, { backgroundColor: glassOverlay }]}
                        />
                        <View style={styles.tileContent}>
                            <View style={styles.labelRow}>
                                {Icon && <Icon width={14} height={14} color={theme.textMuted} />}
                                <JempText type="caption" color={theme.textMuted} style={styles.label} numberOfLines={1}>
                                    {getCategoryLabelShort(slug, t)}
                                </JempText>
                            </View>
                            <View style={styles.valueRow}>
                                <JempText type="h1" style={styles.value}>
                                    {value !== undefined ? String(value) : '—'}
                                </JempText>
                                {trend !== null && <TrendBadge trend={trend} />}
                            </View>
                        </View>
                        <View style={styles.sparkWrap}>
                            <Sparkline
                                data={history[slug] ?? []}
                                negative={trend !== null && trend < 0}
                                delay={index * 80}
                            />
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}


const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
        width: '48.25%',
        borderRadius: 16,
        borderWidth: 1,
        paddingBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    glassFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        overflow: 'hidden',
    },
    tileContent: {
        paddingHorizontal: 12,
        paddingTop: 12,
        gap: 4,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    label: { fontSize: 11, letterSpacing: 0.3, flexShrink: 1 },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    value: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
    sparkWrap: { marginTop: 'auto', paddingTop: 8 },
});
