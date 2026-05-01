import { exerciseThumbnailUrl, exerciseVideoUrl } from '@/helpers/exercise-storage';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Dimensions, Linking, Pressable, StyleSheet, View } from 'react-native';
import { trackerManager } from '@/lib/tracking/tracker-manager';

const PLACEHOLDER = require('@/assets/images/splash-icon.png');

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
};

function StorageVideoPlayer({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, p => {
        p.loop = false;
    });

    return (
        <VideoView
            player={player}
            style={styles.hero}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
        />
    );
}

function YoutubePlayer({ videoId }: { videoId: string }) {
    const { width } = Dimensions.get('window');
    return (
        <View style={styles.hero}>
            <YoutubeIframe height={HERO_HEIGHT} width={width} videoId={videoId} play={false} />
        </View>
    );
}

function StaticHero({
    thumbnailStoragePath,
    youtubeUrl,
    exerciseId,
}: {
    thumbnailStoragePath: string | null | undefined;
    youtubeUrl: string | null | undefined;
    exerciseId: string;
}) {
    const thumbUrl = exerciseThumbnailUrl(thumbnailStoragePath);
    const source = thumbUrl ? { uri: thumbUrl } : PLACEHOLDER;

    return (
        <Pressable
            style={styles.hero}
            onPress={() => {
                if (youtubeUrl) {
                    trackerManager.track('exercise_video_started', { exercise_id: exerciseId });
                    Linking.openURL(youtubeUrl);
                }
            }}
            disabled={!youtubeUrl}
        >
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                locations={[0.4, 1]}
                style={StyleSheet.absoluteFill}
            />
            {youtubeUrl && (
                <View style={styles.playButton}>
                    <Ionicons name="play" size={28} color="#fff" />
                </View>
            )}
        </Pressable>
    );
}

export function ExerciseVideoHero({ videoStoragePath, youtubeUrl, thumbnailStoragePath, exerciseId }: Props) {
    const videoUri = exerciseVideoUrl(videoStoragePath);

    if (videoUri) {
        return <StorageVideoPlayer uri={videoUri} />;
    }

    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;
    if (youtubeId) {
        return <YoutubePlayer videoId={youtubeId} />;
    }

    return (
        <StaticHero
            thumbnailStoragePath={thumbnailStoragePath}
            youtubeUrl={youtubeUrl}
            exerciseId={exerciseId}
        />
    );
}

const styles = StyleSheet.create({
    hero: {
        height: HERO_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
