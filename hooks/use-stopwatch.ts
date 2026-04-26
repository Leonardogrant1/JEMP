import { useEffect, useRef, useState } from 'react';

export function useStopwatch() {
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [attempts, setAttempts] = useState<number[]>([]);
    const startRef = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    const start = () => {
        startRef.current = Date.now();
        setElapsed(0);
        setIsRunning(true);
        intervalRef.current = setInterval(() => {
            setElapsed(Date.now() - startRef.current);
        }, 30);
    };

    const stop = (): number => {
        // Snapshot timestamp before any async work so the measurement isn't skewed
        const stoppedAt = Date.now();
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
        const time = parseFloat(((stoppedAt - startRef.current) / 1000).toFixed(2));
        setAttempts(prev => [...prev, time]);
        setElapsed(0);
        return time;
    };

    const reset = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
        setElapsed(0);
        setAttempts([]);
    };

    const bestTime = attempts.length > 0 ? Math.min(...attempts) : null;

    return { elapsed, isRunning, attempts, bestTime, start, stop, reset };
}
