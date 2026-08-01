import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Children, Fragment, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** Card container for SettingsRows — rows are separated by inset hairline dividers. */
export function SettingsGroup({ children }: { children: ReactNode }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const items = Children.toArray(children);

    return (
        <View style={[styles.group, { backgroundColor: theme.surface }]}>
            {items.map((child, index) => (
                <Fragment key={index}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />}
                    {child}
                </Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    group: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 52,
    },
});
