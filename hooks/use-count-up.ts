import { useEffect, useRef, useState } from 'react';

/** Animates from the currently displayed value to the target with ease-out. */
export function useCountUp(target: number | null, duration = 800): number | null {
    const [display, setDisplay] = useState(0);
    const displayRef = useRef(0);

    useEffect(() => {
        if (target === null) return;
        const from = displayRef.current;
        const start = performance.now();
        let raf: number;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(from + (target - from) * eased);
            displayRef.current = value;
            setDisplay(value);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return target === null ? null : display;
}
