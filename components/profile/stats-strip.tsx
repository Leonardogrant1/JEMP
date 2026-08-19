import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import { Fragment, ReactNode } from "react";
import { StyleProp, StyleSheet, TextStyle, View } from "react-native";
import { JempText } from "../jemp-text";


export interface StatStripItem {
    label: string;
    value?: string;
    unit?: string;
    icon?: ReactNode; // rendered instead of the value (e.g. gender symbol)
    gradient?: boolean; // brand-gradient value (hero stats)
    valueType?: 'h1' | 'h2'; // h1 for emphasized hero stats — the gradient path only sizes via type
    valueStyle?: StyleProp<TextStyle>;
}

/** Horizontal glass strip with big values and uppercase labels, divided by hairlines. */
export function StatsStrip({ items }: { items: StatStripItem[] }) {
    const colorScheme = useColorScheme();
    const isDark = (colorScheme ?? 'dark') === 'dark';
    const theme = Colors[isDark ? 'dark' : 'light'];

    const glassOverlay = isDark ? 'rgba(18, 20, 26, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    return (
        <View style={[styles.strip, { borderColor }]}>
            <BlurView
                intensity={40}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.glassFill, { backgroundColor: glassOverlay }]}
            />
            {items.map((item, index) => (
                <Fragment key={item.label}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />}
                    <View style={styles.item}>
                        <View style={styles.valueRow}>
                            {item.icon ?? (
                                <JempText
                                    type={item.valueType ?? 'h2'}
                                    color={item.gradient ? undefined : theme.text}
                                    gradient={item.gradient}
                                    style={[item.valueType ? undefined : styles.value, item.valueStyle]}
                                >
                                    {item.value}
                                </JempText>
                            )}
                            {item.unit && (
                                <JempText type="caption" color={theme.textMuted} style={styles.unit}>
                                    {item.unit}
                                </JempText>
                            )}
                        </View>
                        <JempText type="caption" color={theme.textMuted} style={styles.label}>
                            {item.label}
                        </JempText>
                    </View>
                </Fragment>
            ))}
        </View>
    );
}


const styles = StyleSheet.create({
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 16,
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
        borderRadius: 20,
        overflow: 'hidden',
    },
    item: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
        minHeight: 28,
    },
    value: {
        fontSize: 22,
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    unit: { fontSize: 11 },
    label: {
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    divider: {
        width: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
        marginVertical: 2,
    },
});
