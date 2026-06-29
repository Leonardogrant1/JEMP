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

    const setRestSeconds = useActiveSessionUIStore(s => s.setRestSeconds);
    const setTotalRestSeconds = useActiveSessionUIStore(s => s.setTotalRestSeconds);
    const setIsResting = useActiveSessionUIStore(s => s.setIsResting);

    const stop = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsResting(false);
        setRestSeconds(0);
    }, [setIsResting, setRestSeconds]);

    const start = useCallback((seconds: number) => {
        stop();
        setRestSeconds(seconds);
        setTotalRestSeconds(seconds);
        setIsResting(true);
        timerRef.current = setInterval(() => {
            setRestSeconds(prev => {
                if (prev <= 1) {
                    stop();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [stop, setRestSeconds, setTotalRestSeconds, setIsResting]);

    const addTime = useCallback((seconds: number) => {
        setRestSeconds(prev => prev + seconds);
        setTotalRestSeconds(prev => prev + seconds);
    }, [setRestSeconds, setTotalRestSeconds]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
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
