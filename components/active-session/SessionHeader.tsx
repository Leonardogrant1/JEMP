import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = { onBack: () => void };

export function SessionHeader({ onBack }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);

    const current = allExercises[exerciseIdx] ?? null;

    // Blöcke aus der flachen Übungsliste rekonstruieren — ein Segment pro
    // Block, Breite proportional zur Übungszahl
    const blocks: { id: string; label: string; count: number; startIdx: number }[] = [];
    allExercises.forEach((ex, i) => {
        const last = blocks[blocks.length - 1];
        if (last && last.id === ex.blockId) {
            last.count += 1;
        } else {
            blocks.push({
                id: ex.blockId,
                label: ex.blockType ? t(`block_type.${ex.blockType.slug}` as never) : t('ui.active_session'),
                count: 1,
                startIdx: i,
            });
        }
    });

    const currentBlockLabel = current?.blockType
        ? t(`block_type.${current.blockType.slug}` as never)
        : t('ui.active_session');

    return (
        <View style={[styles.header, { borderBottomColor: theme.borderStrong }]}>
            <Pressable onPress={onBack} style={styles.headerSide}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.headerCenter}>
                <JempText type="caption" color={GradientMid} style={styles.blockLabel}>
                    {String(currentBlockLabel).toUpperCase()}
                </JempText>
                <View style={styles.segmentsRow}>
                    {blocks.map((block) => {
                        // Fortschritt innerhalb des Blocks: aktuelle Übung zählt mit
                        const doneInBlock = Math.min(
                            Math.max(exerciseIdx + 1 - block.startIdx, 0),
                            block.count,
                        );
                        const fill = block.count > 0 ? doneInBlock / block.count : 0;
                        return (
                            <View
                                key={block.id}
                                style={[
                                    styles.segmentTrack,
                                    { flex: block.count, backgroundColor: theme.borderStrong },
                                ]}
                            >
                                <View style={[styles.segmentFill, { width: `${fill * 100}%` as never }]}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </View>
                            </View>
                        );
                    })}
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
    headerCenter: { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 12 },
    blockLabel: { letterSpacing: 2 },
    segmentsRow: {
        flexDirection: 'row',
        gap: 4,
        width: '85%',
    },
    segmentTrack: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    segmentFill: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
});
