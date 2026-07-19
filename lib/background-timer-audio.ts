import { AudioPlayer, createAudioPlayer } from 'expo-audio';

/**
 * Keeps the audio session active while a timer is running by looping a silent
 * track. With background playback enabled (UIBackgroundModes "audio" on iOS,
 * foreground service on Android), this prevents the OS from suspending the JS
 * thread when the screen is locked — so timers keep ticking and countdown
 * sounds keep playing, like a boxing round timer app.
 *
 * Ref-counted via owner keys so exercise timer and rest timer can hold the
 * session independently.
 */

const owners = new Set<string>();
let player: AudioPlayer | null = null;

type TickListener = () => void;
const tickListeners = new Set<TickListener>();

function ensurePlayer(): AudioPlayer {
    if (!player) {
        player = createAudioPlayer(require('@/assets/sounds/silence.wav'), { updateInterval: 250 });
        player.loop = true;
        player.addListener('playbackStatusUpdate', () => {
            tickListeners.forEach((listener) => listener());
        });
    }
    return player;
}

export function acquireBackgroundAudio(owner: string) {
    owners.add(owner);
    const p = ensurePlayer();
    if (!p.playing) {
        p.seekTo(0);
        p.play();
    }
}

export function releaseBackgroundAudio(owner: string) {
    owners.delete(owner);
    if (owners.size === 0 && player) {
        player.pause();
    }
}

/**
 * Register a tick callback driven by the silent loop's native playback events.
 * Android pauses JS `setInterval` timers while the screen is locked, but native
 * module events still reach JS — so timers register their tick here (in
 * addition to their normal interval) to keep counting and playing sounds with
 * the screen off. Ticks fire only while a timer holds the background audio.
 * Returns an unsubscribe function.
 */
export function addBackgroundTickListener(listener: TickListener): () => void {
    tickListeners.add(listener);
    return () => {
        tickListeners.delete(listener);
    };
}
