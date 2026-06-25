import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = { onBack: () => void };

export function SessionHeader({ onBack }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const session = useActiveSessionUIStore(s => s.session);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);

    return (
        <View style={[styles.header, { borderBottomColor: theme.borderStrong }]}>
            <Pressable onPress={onBack} style={styles.headerSide}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.headerCenter}>
                <JempText type="body-l" color={theme.textMuted} numberOfLines={1}>
                    {session?.name}
                </JempText>
                <View style={[styles.progressTrack, { backgroundColor: theme.borderStrong }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: allExercises.length > 0
                                    ? `${((exerciseIdx + 1) / allExercises.length) * 100}%` as any
                                    : '0%',
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                </View>
            </View>
            <View style={styles.headerSide} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    progressTrack: { width: '80%', height: 3, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
});
