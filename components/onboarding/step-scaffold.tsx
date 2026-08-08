import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Props = {
    title?: string;
    subtitle?: string;
    /** Content vertikal zentrieren statt oben anschließen */
    centerContent?: boolean;
    children: ReactNode;
};

/**
 * Einheitliches Step-Layout: Titel + Subtitle oben gepinnt (beide optional),
 * darunter der Content — so sitzt der Titel auf jedem Step an derselben Stelle.
 */
export function StepScaffold({ title, subtitle, centerContent, children }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            {(title || subtitle) && (
                <View style={styles.header}>
                    {title && (
                        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                            <JempText type="h1">{title}</JempText>
                        </Animated.View>
                    )}
                    {subtitle && (
                        <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                            <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                                {subtitle}
                            </JempText>
                        </Animated.View>
                    )}
                </View>
            )}
            <View style={[styles.content, centerContent && styles.centered]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 24,
    },
    header: {
        gap: 10,
        marginBottom: 44,
    },
    subtitle: {
        lineHeight: 22,
    },
    content: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        // Optischer Ausgleich für den Continue-Button unter dem Step
        paddingBottom: 40,
    },
});
