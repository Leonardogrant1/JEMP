import { exerciseThumbnailUrl, exerciseVideoUrl } from '@/helpers/exercise-storage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { JempText } from '@/components/jemp-text';
import { trackerManager } from '@/lib/tracking/tracker-manager';

const PLACEHOLDER = require('@/assets/images/splash-icon.png');
const YOUTUBE_RED = '#FF0000';

const HERO_HEIGHT = 240;

function extractYoutubeId(url: string): string | null {
    const match = url.match(/(?:v=|\/)([\w-]{11})/);
    return match?.[1] ?? null;
}

type Props = {
    videoStoragePath: string | null | undefined;
    youtubeUrl: string | null | undefined;
    thumbnailStoragePath: string | null | undefined;
    exerciseId: string;
    height?: number;
};

function StorageVideoPlayer({ uri, height }: { uri: string; height: number }) {
    const player = useVideoPlayer(uri, p => {
        p.loop = false;
    });

    return (
        <VideoView
            player={player}
            style={[styles.hero, { height }]}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
        />
    );
}

// YouTube-Video vorhanden, aber (noch) kein eigenes: hochwertige Vorschau mit
// „Video folgt bald" + „Auf YouTube ansehen" — Tap spielt das YT-Video INLINE
// in der App ab (kein Absprung in die YouTube-App).
function YoutubeHero({
    videoId,
    thumbnailStoragePath,
    exerciseId,
    height,
}: {
    videoId: string;
    thumbnailStoragePath: string | null | undefined;
    exerciseId: string;
    height: number;
}) {
    const { t } = useTranslation();
    const { width } = Dimensions.get('window');
    const [playing, setPlaying] = useState(false);

    if (playing) {
        return (
            <Animated.View entering={FadeIn.duration(250)} style={[styles.hero, { height, backgroundColor: '#000' }]}>
                <YoutubeIframe height={height} width={width} videoId={videoId} play />
            </Animated.View>
        );
    }

    const thumbUrl = exerciseThumbnailUrl(thumbnailStoragePath);
    const source = thumbUrl ? { uri: thumbUrl } : PLACEHOLDER;

    return (
        <Pressable
            style={[styles.hero, { height }]}
            onPress={() => {
                trackerManager.track('exercise_video_started', { exercise_id: exerciseId, source: 'youtube' });
                setPlaying(true);
            }}
        >
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* „Video folgt bald" oben als dezentes Glass-Label */}
            <View style={styles.comingSoonBadge}>
                <Ionicons name="sparkles" size={12} color="#fff" />
                <JempText type="caption" color="rgba(255,255,255,0.9)">
                    {t('ui.exercise_video_coming_soon')}
                </JempText>
            </View>

            {/* „Auf YouTube ansehen"-Button mittig */}
            <View style={styles.watchButton}>
                <Ionicons name="logo-youtube" size={20} color={YOUTUBE_RED} />
                <JempText type="button" color="#fff">
                    {t('ui.exercise_watch_on_youtube')}
                </JempText>
            </View>
        </Pressable>
    );
}

function StaticHero({
    thumbnailStoragePath,
    height,
}: {
    thumbnailStoragePath: string | null | undefined;
    height: number;
}) {
    const thumbUrl = exerciseThumbnailUrl(thumbnailStoragePath);
    const source = thumbUrl ? { uri: thumbUrl } : PLACEHOLDER;

    return (
        <View style={[styles.hero, { height }]}>
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                locations={[0.4, 1]}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}

export function ExerciseVideoHero({ videoStoragePath, youtubeUrl, thumbnailStoragePath, exerciseId, height = HERO_HEIGHT }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const videoUri = exerciseVideoUrl(videoStoragePath);

    // 1. Eigenes Video → nativer Player
    if (videoUri) {
        return <StorageVideoPlayer uri={videoUri} height={height} />;
    }

    // 2. YouTube-Video vorhanden → Premium-Vorschau, Inline-Wiedergabe
    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;
    if (youtubeId) {
        return (
            <View style={{ backgroundColor: theme.surface }}>
                <YoutubeHero
                    videoId={youtubeId}
                    thumbnailStoragePath={thumbnailStoragePath}
                    exerciseId={exerciseId}
                    height={height}
                />
            </View>
        );
    }

    // 3. Kein Video → statisches Thumbnail
    return <StaticHero thumbnailStoragePath={thumbnailStoragePath} height={height} />;
}

const styles = StyleSheet.create({
    hero: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    comingSoonBadge: {
        position: 'absolute',
        // Unten links statt oben links — oben sitzt der fixe Close-Button
        bottom: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
    },
    watchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 100,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.25)',
    },
});
