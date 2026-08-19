import { JempText } from '@/components/jemp-text';
import { UNIT_LABELS } from '@/constants/assessment-constants';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { flightTimeToJumpHeightCm } from '@/helpers/jump-physics';
import { displayMetricValue } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnitSystem } from '@/hooks/use-unit-system';
import { useModalResultStore } from '@/stores/modal-result-store';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEvent } from 'expo';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Camera,
    useCameraDevice,
    useCameraFormat,
    useCameraPermission,
} from 'react-native-vision-camera';

type Clip = { uri: string; duration: number };

// ─── Review: Frame-Scrubbing + Absprung/Landung markieren ────────────────────

function ReviewPhase({ clip, fps, onRetake }: {
    clip: Clip;
    fps: number;
    onRetake: () => void;
}) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const unitSystem = useUnitSystem();
    const setMeasuredJumpCm = useModalResultStore((s) => s.setMeasuredJumpCm);

    const player = useVideoPlayer(clip.uri, (p) => {
        p.loop = false;
        p.pause();
    });
    // Re-Render sobald die Videodauer bekannt ist
    useEvent(player, 'statusChange', { status: player.status });
    const duration = player.duration > 0 ? player.duration : clip.duration;

    const [time, setTime] = useState(0);
    const [takeoff, setTakeoff] = useState<number | null>(null);
    const [landing, setLanding] = useState<number | null>(null);

    const frameDur = 1 / fps;

    function seekTo(value: number) {
        const clamped = Math.min(Math.max(value, 0), duration);
        setTime(clamped);
        // expo-video seekt über Property-Zuweisung (default: exakt, Toleranz 0)
        // eslint-disable-next-line react-hooks/immutability
        player.currentTime = clamped;
    }

    function stepFrames(frames: number) {
        seekTo(time + frames * frameDur);
    }

    function setMark(which: 'takeoff' | 'landing') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (which === 'takeoff') setTakeoff(time);
        else setLanding(time);
    }

    const flight = takeoff !== null && landing !== null ? landing - takeoff : null;
    const heightCm = flight !== null && flight > 0 ? flightTimeToJumpHeightCm(flight) : null;
    const converted = heightCm !== null ? displayMetricValue(heightCm, 'cm', unitSystem) : null;
    const unitLabel = converted
        ? UNIT_LABELS[converted.unit ?? '']?.[i18n.language === 'de' ? 'de' : 'en'] ?? converted.unit
        : '';

    function handleUse() {
        if (heightCm === null) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMeasuredJumpCm(heightCm);
        router.back();
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.reviewHeader}>
                <Pressable onPress={onRetake} hitSlop={12} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </Pressable>
                <JempText type="body-l" color="#fff">{t('jump.review_title')}</JempText>
                <View style={styles.headerBtn} />
            </View>

            <View style={styles.videoWrap}>
                <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
            </View>

            {/* ── Scrubber: Slider grob, Frame-Buttons fein ── */}
            <View style={styles.scrubSection}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={Math.max(duration, frameDur)}
                    value={time}
                    onValueChange={seekTo}
                    minimumTrackTintColor={GradientMid}
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#fff"
                />
                <View style={styles.frameRow}>
                    <FrameButton icon="play-back" onPress={() => stepFrames(-10)} />
                    <FrameButton icon="chevron-back" onPress={() => stepFrames(-1)} />
                    <JempText type="caption" color="rgba(255,255,255,0.6)" style={styles.timeReadout}>
                        {time.toFixed(3)} s
                    </JempText>
                    <FrameButton icon="chevron-forward" onPress={() => stepFrames(1)} />
                    <FrameButton icon="play-forward" onPress={() => stepFrames(10)} />
                </View>
            </View>

            {/* ── Marker ── */}
            <View style={styles.markRow}>
                <MarkButton
                    label={t('jump.mark_takeoff')}
                    value={takeoff}
                    onPress={() => setMark('takeoff')}
                />
                <MarkButton
                    label={t('jump.mark_landing')}
                    value={landing}
                    onPress={() => setMark('landing')}
                />
            </View>

            {/* ── Ergebnis oder Anleitung ── */}
            {converted !== null && flight !== null ? (
                <View style={styles.resultBlock}>
                    <JempText type="hero" gradient style={styles.resultValue}>
                        {`${converted.value} ${unitLabel}`}
                    </JempText>
                    <JempText type="caption" color="rgba(255,255,255,0.6)">
                        {t('jump.flight_time', { time: flight.toFixed(3) })}
                    </JempText>
                </View>
            ) : (
                <View style={styles.resultBlock}>
                    <JempText type="caption" color="rgba(255,255,255,0.6)" style={styles.hintText}>
                        {takeoff === null ? t('jump.mark_takeoff_hint') : t('jump.mark_landing_hint')}
                    </JempText>
                </View>
            )}

            <Pressable style={styles.cta} onPress={handleUse} disabled={heightCm === null}>
                <LinearGradient
                    colors={heightCm !== null ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                >
                    <JempText type="button" color="#fff">{t('jump.use_result')}</JempText>
                </LinearGradient>
            </Pressable>
        </View>
    );
}

function FrameButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={6}
            style={({ pressed }) => [styles.frameBtn, pressed && { opacity: 0.6 }]}
        >
            <Ionicons name={icon} size={20} color="#fff" />
        </Pressable>
    );
}

function MarkButton({ label, value, onPress }: { label: string; value: number | null; onPress: () => void }) {
    const set = value !== null;
    return (
        <Pressable
            onPress={onPress}
            style={[styles.markBtn, set && { borderColor: GradientMid, backgroundColor: `${GradientMid}18` }]}
        >
            <Ionicons
                name={set ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={set ? GradientMid : 'rgba(255,255,255,0.5)'}
            />
            <View>
                <JempText type="button" color={set ? GradientMid : '#fff'}>{label}</JempText>
                <JempText type="caption" color="rgba(255,255,255,0.5)">
                    {set ? `${value!.toFixed(3)} s` : '—'}
                </JempText>
            </View>
        </Pressable>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function JumpMeasureScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    // FPS hat Vorrang vor Auflösung — je höher die Framerate, desto genauer
    // die Flugzeit (240fps ≈ ±0,5cm, 120fps ≈ ±1cm, 30fps ≈ ±4cm pro Frame)
    const format = useCameraFormat(device, [
        { fps: 240 },
        { videoResolution: { width: 1280, height: 720 } },
    ]);
    const fps = Math.min(format?.maxFps ?? 30, 240);

    const cameraRef = useRef<Camera>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [clip, setClip] = useState<Clip | null>(null);

    useEffect(() => {
        if (!hasPermission) requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasPermission]);

    useEffect(() => {
        if (!isRecording) return;
        const startedAt = Date.now();
        const interval = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100);
        return () => clearInterval(interval);
    }, [isRecording]);

    function startRecording() {
        if (!cameraRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setElapsed(0);
        setIsRecording(true);
        cameraRef.current.startRecording({
            fileType: 'mp4',
            videoCodec: 'h264',
            onRecordingFinished: (video) => {
                setIsRecording(false);
                const uri = video.path.startsWith('file://') ? video.path : `file://${video.path}`;
                setClip({ uri, duration: video.duration });
            },
            onRecordingError: (error) => {
                console.error('jump recording error:', error);
                setIsRecording(false);
            },
        });
    }

    function stopRecording() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        cameraRef.current?.stopRecording();
    }

    // ── Review-Phase ──
    if (clip) {
        return <ReviewPhase clip={clip} fps={fps} onRetake={() => setClip(null)} />;
    }

    // ── Kein Zugriff / kein Gerät ──
    if (!hasPermission || !device) {
        return (
            <View style={[styles.root, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <Ionicons name="videocam-off-outline" size={44} color="rgba(255,255,255,0.5)" />
                <JempText type="h2" color="#fff" style={styles.centerText}>
                    {t('jump.permission_title')}
                </JempText>
                <JempText type="body-l" color="rgba(255,255,255,0.6)" style={styles.centerText}>
                    {device ? t('jump.permission_body') : t('jump.no_camera')}
                </JempText>
                {device && (
                    <Pressable
                        style={[styles.settingsBtn, { backgroundColor: theme.surface }]}
                        onPress={() => Linking.openSettings()}
                    >
                        <JempText type="body-l" color="#fff">{t('jump.open_settings')}</JempText>
                    </Pressable>
                )}
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.centerClose}>
                    <JempText type="body-l" color="rgba(255,255,255,0.6)">{t('ui.close')}</JempText>
                </Pressable>
            </View>
        );
    }

    // ── Kamera-Phase ──
    return (
        <View style={styles.root}>
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                format={format}
                fps={fps}
                isActive
                video
                audio={false}
            />

            <View style={[styles.cameraOverlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.cameraHeader}>
                    <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </Pressable>
                    <View style={styles.fpsBadge}>
                        {isRecording && <View style={styles.recDot} />}
                        <JempText type="caption" color="#fff">
                            {isRecording ? `${elapsed.toFixed(1)} s` : `${fps} FPS`}
                        </JempText>
                    </View>
                    <View style={styles.headerBtn} />
                </View>

                <View style={styles.cameraFooter}>
                    <JempText type="caption" color="rgba(255,255,255,0.85)" style={styles.guidance}>
                        {isRecording ? t('jump.recording_hint') : t('jump.record_hint')}
                    </JempText>
                    <Pressable
                        onPress={isRecording ? stopRecording : startRecording}
                        style={styles.recordBtn}
                    >
                        <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    centerText: { textAlign: 'center' },
    centerClose: { marginTop: 12, padding: 8 },
    settingsBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },

    // Camera phase
    cameraOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerBtn: { width: 32, alignItems: 'flex-start' },
    fpsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
    },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    cameraFooter: { alignItems: 'center', gap: 20 },
    guidance: {
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        overflow: 'hidden',
        lineHeight: 18,
    },
    recordBtn: {
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#ef4444' },
    recordInnerActive: { width: 30, height: 30, borderRadius: 8 },

    // Review phase
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    videoWrap: { flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
    video: { flex: 1 },
    scrubSection: { paddingHorizontal: 20, paddingTop: 10 },
    slider: { width: '100%', height: 36 },
    frameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
    frameBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeReadout: { minWidth: 70, textAlign: 'center', fontVariant: ['tabular-nums'] },
    markRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14 },
    markBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    resultBlock: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 32, minHeight: 74, gap: 2 },
    resultValue: { letterSpacing: -1 },
    hintText: { textAlign: 'center', lineHeight: 18 },
    cta: { marginHorizontal: 20, marginTop: 8, borderRadius: 100, overflow: 'hidden' },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
