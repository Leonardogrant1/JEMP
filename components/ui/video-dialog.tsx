import { JempText } from '@/components/jemp-text';
import { Colors, GRADIENT } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';

function extractYoutubeId(url: string): string | null {
    const match = url.match(/(?:v=|\/)([\w-]{11})/);
    return match?.[1] ?? null;
}

function StorageVideo({ uri, width }: { uri: string; width: number }) {
    const player = useVideoPlayer(uri, p => {
        p.loop = false;
    });
    return (
        <VideoView
            player={player}
            style={[styles.video, { width, height: (width * 9) / 16 }]}
            nativeControls
        />
    );
}

type VideoDialogProps = {
    visible: boolean;
    title: string;
    videoUrl: string | null | undefined; // resolved public URL of an uploaded video
    youtubeUrl: string | null | undefined;
    buttonLabel: string;
    onDismiss: () => void;
};

// Video modal in JEMP dialog style — an uploaded video takes priority over YouTube
export function VideoDialog({ visible, title, videoUrl, youtubeUrl, buttonLabel, onDismiss }: VideoDialogProps) {
    const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
    const colors = Colors[scheme];
    const { width: windowWidth } = useWindowDimensions();

    if (!visible) return null;

    // backdrop padding (2 × 16) + card padding (2 × 16)
    const videoWidth = windowWidth - 64;
    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
            <Pressable style={styles.backdrop} onPress={onDismiss}>
                <Pressable
                    onPress={e => e.stopPropagation()}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}
                >
                    <JempText type="h2" style={styles.title}>{title}</JempText>

                    {videoUrl ? (
                        <StorageVideo uri={videoUrl} width={videoWidth} />
                    ) : youtubeId ? (
                        <View style={styles.video}>
                            <YoutubeIframe height={(videoWidth * 9) / 16} width={videoWidth} videoId={youtubeId} />
                        </View>
                    ) : null}

                    <Pressable onPress={onDismiss} style={styles.buttonWrapper}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            <JempText type="button" color="#fff">{buttonLabel}</JempText>
                        </LinearGradient>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        gap: 12,
        alignItems: 'center',
    },
    title: { textAlign: 'center' },
    video: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    buttonWrapper: { alignSelf: 'stretch' },
    button: {
        height: 52,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
