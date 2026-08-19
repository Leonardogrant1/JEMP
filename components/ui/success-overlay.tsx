import { createAudioPlayer } from 'expo-audio';
import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

type SuccessOverlayProps = {
    visible: boolean;
    onDone: () => void;
};

// Brief fullscreen check animation + sound, auto-dismisses via onDone
export function SuccessOverlay({ visible, onDone }: SuccessOverlayProps) {
    // Keep the main effect keyed on `visible` only — a changing onDone identity
    // (inline arrow in the parent) must not restart sound and timer.
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    }, [onDone]);

    useEffect(() => {
        if (!visible) return;
        const player = createAudioPlayer(require('@/assets/sounds/check.mp3'));
        player.play();
        const timer = setTimeout(() => onDoneRef.current(), 1500);
        return () => {
            clearTimeout(timer);
            player.remove();
        };
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible>
            <View style={styles.backdrop}>
                <LottieView
                    autoPlay
                    loop={false}
                    source={require('@/assets/animations/check.json')}
                    style={styles.animation}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    animation: {
        width: 90,
        height: 90,
    },
});
