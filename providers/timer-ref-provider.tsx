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
    const [exerciseDuration, setExerciseDuration] = useState(0);
    const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Exercise timer — unilateral
    const [exerciseDurationLeft, setExerciseDurationLeft] = useState(0);
    const [exerciseDurationRight, setExerciseDurationRight] = useState(0);
    const [exerciseTimerActiveSide, setExerciseTimerActiveSide] = useState<'left' | 'right' | null>(null);
    const exerciseTimerSideRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) return; // already running
        setExerciseTimeIsActive(true);
        exerciseTimerRef.current = setInterval(() => {
            setExerciseDuration(prev => prev + 1);
        }, 1000);
    }, []);

    const stopExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) {
            clearInterval(exerciseTimerRef.current);
            exerciseTimerRef.current = null;
        }
        setExerciseTimeIsActive(false);
    }, []);

    const startExerciseTimerSide = useCallback((side: 'left' | 'right') => {
        if (exerciseTimerSideRef.current) return; // already running
        setExerciseTimerActiveSide(side);
        exerciseTimerSideRef.current = setInterval(() => {
            if (side === 'left') {
                setExerciseDurationLeft(prev => prev + 1);
            } else {
                setExerciseDurationRight(prev => prev + 1);
            }
        }, 1000);
    }, []);

    const stopExerciseTimerSide = useCallback(() => {
        if (exerciseTimerSideRef.current) {
            clearInterval(exerciseTimerSideRef.current);
            exerciseTimerSideRef.current = null;
        }
        setExerciseTimerActiveSide(null);
    }, []);

    const resetExerciseTimer = useCallback(() => {
        stopExerciseTimer();
        setExerciseDuration(0);
    }, [stopExerciseTimer]);

    const resetExerciseTimerSide = useCallback((side: 'left' | 'right') => {
        stopExerciseTimerSide();
        if (side === 'left') {
            setExerciseDurationLeft(0);
        } else {
            setExerciseDurationRight(0);
        }
    }, [stopExerciseTimerSide]);

    const resetAllExerciseTimers = useCallback(() => {
        stopExerciseTimer();
        stopExerciseTimerSide();
        setExerciseDuration(0);
        setExerciseDurationLeft(0);
        setExerciseDurationRight(0);
    }, [stopExerciseTimer, stopExerciseTimerSide]);

    // Countdown sounds
    const tickSoundRef = useRef<AudioPlayer | null>(null);
    const endSoundRef = useRef<AudioPlayer | null>(null);
    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true });
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

    useEffect(() => () => { if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current); }, []);
    useEffect(() => () => { if (exerciseTimerSideRef.current) clearInterval(exerciseTimerSideRef.current); }, []);


    return (
        <ExerciseTimerContext.Provider value={{
            startExerciseTimer,
            stopExerciseTimer,
            exerciseTimeIsActive,
            exerciseDuration,
            setExerciseDuration,
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
