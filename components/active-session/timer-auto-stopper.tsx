import { useExerciseTimer } from "@/providers/timer-ref-provider";
import { useActiveSessionStore } from "@/stores/active-session-store";
import { useActiveSessionUIStore } from "@/stores/active-session-ui-store";
import { useEffect } from "react";


/**
 * Feeds the current exercise's target duration into the timer provider.
 * Countdown sounds and auto-stop happen inside the provider's tick, so they
 * also fire while the screen is locked (driven by background audio events).
 */
export function TimerAutoStopper({ children }: { children: React.ReactNode }) {

    const { setExerciseTargetSeconds } = useExerciseTimer();

    const currentExerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);

    const current = allExercises[currentExerciseIdx] ?? null;

    const isDuration = current?.exercise.measurement_type === 'duration';
    const target = isDuration ? current?.target_duration_seconds ?? 0 : 0;

    useEffect(() => {
        setExerciseTargetSeconds(target);
        return () => setExerciseTargetSeconds(0);
    }, [target, setExerciseTargetSeconds]);

    return children;
}
