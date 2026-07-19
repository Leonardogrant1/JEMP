import { acquireBackgroundAudio, addBackgroundTickListener, releaseBackgroundAudio } from "@/lib/background-timer-audio";
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";



type ExerciseTimerContextType = {
    startExerciseTimer: () => void;
    stopExerciseTimer: () => void;
    startExerciseTimerSide: (side: 'left' | 'right') => void;
    stopExerciseTimerSide: () => void;
    resetExerciseTimer: () => void;
    resetExerciseTimerSide: (side: 'left' | 'right') => void;
    resetAllExerciseTimers: () => void;

    // Target duration of the current exercise (0 = open-ended); drives
    // countdown sounds + auto-stop inside the tick
    setExerciseTargetSeconds: (seconds: number) => void;

    // Exercise timer — bilateral
    exerciseTimeIsActive: boolean;
    exerciseDuration: number;
    setExerciseDuration: (exerciseDuration: number) => void;

    // Exercise timer — unilateral
    exerciseDurationLeft: number;
    exerciseDurationRight: number;
    exerciseTimerActiveSide: 'left' | 'right' | null;
    setExerciseDurationLeft: (exerciseDurationLeft: number) => void;
    setExerciseDurationRight: (exerciseDurationRight: number) => void;

    // Sounds
    playTickSound: () => void;
    playEndSound: () => void;

};

const ExerciseTimerContext = createContext<ExerciseTimerContextType | null>(null);

export function ExerciseTimerProvider({ children }: { children: React.ReactNode }) {

    const [exerciseTimeIsActive, setExerciseTimeIsActive] = useState(false);
    const [exerciseDuration, setExerciseDurationState] = useState(0);
    const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Wall-clock based timing so elapsed time stays correct while the JS thread
    // is suspended (screen locked / app backgrounded): seconds accumulated before
    // the current run + timestamp of the current run's start
    const durationBaseRef = useRef(0);
    const startedAtRef = useRef<number | null>(null);
    const lastAnnouncedRef = useRef<number | null>(null);
    const removeTickListenerRef = useRef<(() => void) | null>(null);

    // Exercise timer — unilateral
    const [exerciseDurationLeft, setExerciseDurationLeftState] = useState(0);
    const [exerciseDurationRight, setExerciseDurationRightState] = useState(0);
    const [exerciseTimerActiveSide, setExerciseTimerActiveSide] = useState<'left' | 'right' | null>(null);
    const exerciseTimerSideRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const leftBaseRef = useRef(0);
    const rightBaseRef = useRef(0);
    const sideStartedAtRef = useRef<number | null>(null);
    const activeSideRef = useRef<'left' | 'right' | null>(null);
    const sideLastAnnouncedRef = useRef<number | null>(null);
    const removeSideTickListenerRef = useRef<(() => void) | null>(null);

    const targetSecondsRef = useRef(0);
    const setExerciseTargetSeconds = useCallback((seconds: number) => {
        targetSecondsRef.current = seconds;
    }, []);

    // Countdown sounds
    const tickSoundRef = useRef<AudioPlayer | null>(null);
    const endSoundRef = useRef<AudioPlayer | null>(null);
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentMode: true,
            // Keep the audio session alive when the screen is locked so timers
            // and countdown sounds continue; mix so we don't stop user's music
            shouldPlayInBackground: true,
            interruptionMode: 'mixWithOthers',
        });
        const tick = createAudioPlayer(require('@/assets/sounds/countdown.mp3'));
        const end = createAudioPlayer(require('@/assets/sounds/countdown_end.mp3'));
        tickSoundRef.current = tick;
        endSoundRef.current = end;
        return () => {
            tick.remove();
            end.remove();
        };
    }, []);

    const playTickSound = useCallback(() => {
        if (tickSoundRef.current) {
            tickSoundRef.current.seekTo(0).then(() => tickSoundRef.current?.play());
        }
    }, []);

    const playEndSound = useCallback(() => {
        if (endSoundRef.current) {
            endSoundRef.current.seekTo(0).then(() => endSoundRef.current?.play());
        }
    }, []);

    const setExerciseDuration = useCallback((seconds: number) => {
        durationBaseRef.current = seconds;
        setExerciseDurationState(seconds);
    }, []);

    const setExerciseDurationLeft = useCallback((seconds: number) => {
        leftBaseRef.current = seconds;
        setExerciseDurationLeftState(seconds);
    }, []);

    const setExerciseDurationRight = useCallback((seconds: number) => {
        rightBaseRef.current = seconds;
        setExerciseDurationRightState(seconds);
    }, []);

    const stopExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) {
            clearInterval(exerciseTimerRef.current);
            exerciseTimerRef.current = null;
        }
        if (removeTickListenerRef.current) {
            removeTickListenerRef.current();
            removeTickListenerRef.current = null;
        }
        if (startedAtRef.current !== null) {
            const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
            durationBaseRef.current += elapsed;
            startedAtRef.current = null;
            setExerciseDurationState(durationBaseRef.current);
        }
        setExerciseTimeIsActive(false);
        releaseBackgroundAudio('exercise-timer');
    }, []);

    // Single tick used by both the foreground interval and the background
    // audio events (Android keeps delivering those while JS timers are paused)
    const exerciseTick = useCallback(() => {
        if (startedAtRef.current === null) return;
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const duration = durationBaseRef.current + elapsed;
        const target = targetSecondsRef.current;
        if (target > 0) {
            const remaining = target - duration;
            if (remaining !== lastAnnouncedRef.current) {
                lastAnnouncedRef.current = remaining;
                if (remaining > 0 && remaining <= 3) {
                    playTickSound();
                } else if (remaining <= 0) {
                    playEndSound();
                }
            }
            if (remaining <= 0) {
                stopExerciseTimer();
                setExerciseDuration(target); // keep duration at target so hasInput stays true
                return;
            }
        }
        setExerciseDurationState(duration);
    }, [stopExerciseTimer, setExerciseDuration, playTickSound, playEndSound]);

    const startExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) return; // already running
        acquireBackgroundAudio('exercise-timer');
        setExerciseTimeIsActive(true);
        startedAtRef.current = Date.now();
        lastAnnouncedRef.current = null;
        exerciseTimerRef.current = setInterval(exerciseTick, 250);
        removeTickListenerRef.current = addBackgroundTickListener(exerciseTick);
    }, [exerciseTick]);

    const stopExerciseTimerSide = useCallback(() => {
        if (exerciseTimerSideRef.current) {
            clearInterval(exerciseTimerSideRef.current);
            exerciseTimerSideRef.current = null;
        }
        if (removeSideTickListenerRef.current) {
            removeSideTickListenerRef.current();
            removeSideTickListenerRef.current = null;
        }
        if (sideStartedAtRef.current !== null && activeSideRef.current !== null) {
            const elapsed = Math.floor((Date.now() - sideStartedAtRef.current) / 1000);
            if (activeSideRef.current === 'left') {
                leftBaseRef.current += elapsed;
                setExerciseDurationLeftState(leftBaseRef.current);
            } else {
                rightBaseRef.current += elapsed;
                setExerciseDurationRightState(rightBaseRef.current);
            }
            sideStartedAtRef.current = null;
        }
        activeSideRef.current = null;
        setExerciseTimerActiveSide(null);
        releaseBackgroundAudio('exercise-timer-side');
    }, []);

    const sideTick = useCallback(() => {
        if (sideStartedAtRef.current === null || activeSideRef.current === null) return;
        const side = activeSideRef.current;
        const elapsed = Math.floor((Date.now() - sideStartedAtRef.current) / 1000);
        const base = side === 'left' ? leftBaseRef.current : rightBaseRef.current;
        const duration = base + elapsed;
        const target = targetSecondsRef.current;
        if (target > 0) {
            const remaining = target - duration;
            if (remaining !== sideLastAnnouncedRef.current) {
                sideLastAnnouncedRef.current = remaining;
                if (remaining > 0 && remaining <= 3) {
                    playTickSound();
                } else if (remaining <= 0) {
                    playEndSound();
                }
            }
            if (remaining <= 0) {
                stopExerciseTimerSide();
                if (side === 'left') setExerciseDurationLeft(target);
                else setExerciseDurationRight(target);
                return;
            }
        }
        if (side === 'left') setExerciseDurationLeftState(duration);
        else setExerciseDurationRightState(duration);
    }, [stopExerciseTimerSide, setExerciseDurationLeft, setExerciseDurationRight, playTickSound, playEndSound]);

    const startExerciseTimerSide = useCallback((side: 'left' | 'right') => {
        if (exerciseTimerSideRef.current) return; // already running
        acquireBackgroundAudio('exercise-timer-side');
        setExerciseTimerActiveSide(side);
        activeSideRef.current = side;
        sideStartedAtRef.current = Date.now();
        sideLastAnnouncedRef.current = null;
        exerciseTimerSideRef.current = setInterval(sideTick, 250);
        removeSideTickListenerRef.current = addBackgroundTickListener(sideTick);
    }, [sideTick]);

    const resetExerciseTimer = useCallback(() => {
        stopExerciseTimer();
        setExerciseDuration(0);
    }, [stopExerciseTimer, setExerciseDuration]);

    const resetExerciseTimerSide = useCallback((side: 'left' | 'right') => {
        stopExerciseTimerSide();
        if (side === 'left') {
            setExerciseDurationLeft(0);
        } else {
            setExerciseDurationRight(0);
        }
    }, [stopExerciseTimerSide, setExerciseDurationLeft, setExerciseDurationRight]);

    const resetAllExerciseTimers = useCallback(() => {
        stopExerciseTimer();
        stopExerciseTimerSide();
        setExerciseDuration(0);
        setExerciseDurationLeft(0);
        setExerciseDurationRight(0);
    }, [stopExerciseTimer, stopExerciseTimerSide, setExerciseDuration, setExerciseDurationLeft, setExerciseDurationRight]);

    useEffect(() => () => {
        if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
        if (removeTickListenerRef.current) removeTickListenerRef.current();
        releaseBackgroundAudio('exercise-timer');
    }, []);
    useEffect(() => () => {
        if (exerciseTimerSideRef.current) clearInterval(exerciseTimerSideRef.current);
        if (removeSideTickListenerRef.current) removeSideTickListenerRef.current();
        releaseBackgroundAudio('exercise-timer-side');
    }, []);


    return (
        <ExerciseTimerContext.Provider value={{
            startExerciseTimer,
            stopExerciseTimer,
            exerciseTimeIsActive,
            exerciseDuration,
            setExerciseDuration,
            setExerciseTargetSeconds,
            exerciseDurationLeft,
            exerciseDurationRight,
            setExerciseDurationLeft,
            setExerciseDurationRight,
            exerciseTimerActiveSide,
            startExerciseTimerSide,
            stopExerciseTimerSide,
            playTickSound,
            playEndSound,
            resetExerciseTimer,
            resetExerciseTimerSide,
            resetAllExerciseTimers,
        }}>
            {children}
        </ExerciseTimerContext.Provider>
    );
}

export const useExerciseTimer = () => {
    const ctx = useContext(ExerciseTimerContext);
    if (!ctx) throw new Error("useExerciseTimer must be used within ExerciseTimerProvider");
    return ctx;
};
