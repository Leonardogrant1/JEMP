import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

// Hervorgehobener Hinweis (QA 18.10.: der Speed-Mikro-Dosis-Hinweis ging als
// graue Caption unter) — getönte Box im GradientMid-Stil der Auswahl-Kacheln.
export function InfoCallout({
    icon = 'information-circle-outline',
    text,
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    text: string;
}) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    return (
        <View style={[styles.box, { backgroundColor: `${GradientMid}14`, borderColor: `${GradientMid}40` }]}>
            <Ionicons name={icon} size={18} color={GradientMid} style={styles.icon} />
            <JempText type="caption" color={theme.text} style={styles.text}>
                {text}
            </JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
    },
    icon: { marginTop: 1 },
    text: { flex: 1, lineHeight: 18 },
});
