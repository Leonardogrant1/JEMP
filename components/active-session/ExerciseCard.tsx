import { JempText } from '@/components/jemp-text';
import { SessionChip } from '@/components/plan/SessionChip';
import { Colors } from '@/constants/theme';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function ExerciseCard() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx, exSlideX, exOpacity } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const current = allExercises[exerciseIdx] ?? null;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: exSlideX.value }],
        opacity: exOpacity.value,
    }));

    if (!current) return null;

    const thumbUrl = exerciseThumbnailUrl(current.exercise.thumbnail_storage_path);

    return (
        <Animated.View style={[styles.card, animatedStyle]}>
            {/* Block-Label lebt jetzt im SessionHeader — hier nur der Übungsname */}
            <View style={styles.titleRow}>
                <View style={styles.titleLeft}>
                    <JempText type="h1">{current.exercise.name}</JempText>
                </View>
            </View>

            {/* Thumbnail statt eingebettetem Video-Player — Details (inkl. Video)
                liegen auf der Exercise-Detail-Seite */}
            <Pressable
                style={styles.thumbCard}
                onPress={() => router.push(`/exercise/${current.exercise.id}`)}
            >
                {thumbUrl ? (
                    <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface }]} />
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                    locations={[0.5, 1]}
                    style={StyleSheet.absoluteFill}
                />
                {/* Equipment als Glass-Chips direkt auf dem Thumbnail */}
                {current.exercise.equipment?.length > 0 && (
                    <View style={styles.equipmentRow}>
                        {current.exercise.equipment.map((eq, i) => {
                            const label = (eq.name_i18n as any)?.[locale] ?? eq.slug;
                            return <SessionChip key={i} label={label} />;
                        })}
                    </View>
                )}
                <View style={styles.thumbCta}>
                    <Ionicons name="play-circle-outline" size={16} color="#fff" />
                    <JempText type="caption" color="#fff">{t('ui.view_details')}</JempText>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: { gap: 16 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleLeft: { flex: 1, gap: 6 },
    thumbCard: {
        height: 180,
        borderRadius: 20,
        overflow: 'hidden',
    },
    thumbCta: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 100,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    equipmentRow: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        right: 110,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
});
