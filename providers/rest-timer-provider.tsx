import { acquireBackgroundAudio, addBackgroundTickListener, releaseBackgroundAudio } from '@/lib/background-timer-audio';
import { useExerciseTimer } from '@/providers/timer-ref-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

type RestTimerContextType = {
    start: (seconds: number) => void;
    stop: () => void;
    addTime: (seconds: number) => void;
};

const RestTimerContext = createContext<RestTimerContextType | null>(null);

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Wall-clock end time so the countdown stays correct while the JS thread
    // is suspended (screen locked / app backgrounded)
    const endsAtRef = useRef<number | null>(null);
    const lastAnnouncedRef = useRef<number | null>(null);
    const removeTickListenerRef = useRef<(() => void) | null>(null);

    const { playTickSound, playEndSound } = useExerciseTimer();

    const setRestSeconds = useActiveSessionUIStore(s => s.setRestSeconds);
    const setTotalRestSeconds = useActiveSessionUIStore(s => s.setTotalRestSeconds);
    const setIsResting = useActiveSessionUIStore(s => s.setIsResting);

    const stop = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (removeTickListenerRef.current) {
            removeTickListenerRef.current();
            removeTickListenerRef.current = null;
        }
        endsAtRef.current = null;
        setIsResting(false);
        setRestSeconds(0);
        releaseBackgroundAudio('rest-timer');
    }, [setIsResting, setRestSeconds]);

    // Single tick used by both the foreground interval and the background
    // audio events (Android keeps delivering those while JS timers are paused)
    const tick = useCallback(() => {
        if (endsAtRef.current === null) return;
        const remaining = Math.ceil((endsAtRef.current - Date.now()) / 1000);
        // Countdown sounds, each second announced at most once
        if (remaining !== lastAnnouncedRef.current) {
            lastAnnouncedRef.current = remaining;
            if (remaining > 0 && remaining <= 3) {
                playTickSound();
            } else if (remaining <= 0) {
                playEndSound();
            }
        }
        if (remaining <= 0) {
            stop();
        } else {
            setRestSeconds(remaining);
        }
    }, [stop, setRestSeconds, playTickSound, playEndSound]);

    const start = useCallback((seconds: number) => {
        stop();
        acquireBackgroundAudio('rest-timer');
        endsAtRef.current = Date.now() + seconds * 1000;
        lastAnnouncedRef.current = null;
        setRestSeconds(seconds);
        setTotalRestSeconds(seconds);
        setIsResting(true);
        timerRef.current = setInterval(tick, 250);
        removeTickListenerRef.current = addBackgroundTickListener(tick);
    }, [stop, tick, setRestSeconds, setTotalRestSeconds, setIsResting]);

    const addTime = useCallback((seconds: number) => {
        if (endsAtRef.current !== null) {
            endsAtRef.current += seconds * 1000;
        }
        setRestSeconds(prev => prev + seconds);
        setTotalRestSeconds(prev => prev + seconds);
    }, [setRestSeconds, setTotalRestSeconds]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (removeTickListenerRef.current) removeTickListenerRef.current();
        releaseBackgroundAudio('rest-timer');
    }, []);

    return (
        <RestTimerContext.Provider value={{ start, stop, addTime }}>
            {children}
        </RestTimerContext.Provider>
    );
}

export const useRestTimer = () => {
    const ctx = useContext(RestTimerContext);
    if (!ctx) throw new Error('useRestTimer must be used within RestTimerProvider');
    return ctx;
};
