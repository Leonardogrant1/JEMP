import { useExerciseTimer } from "@/providers/timer-ref-provider";
import { useActiveSessionStore } from "@/stores/active-session-store";
import { useActiveSessionUIStore } from "@/stores/active-session-ui-store";
import { useEffect } from "react";


export function TimerAutoStopper({ children }: { children: React.ReactNode }) {

    const { playTickSound, playEndSound, stopExerciseTimer, stopExerciseTimerSide, setExerciseDuration, setExerciseDurationLeft, setExerciseDurationRight, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, exerciseTimerActiveSide } = useExerciseTimer();

    const currentExerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);

    const current = allExercises[currentExerciseIdx] ?? null;

    const isUnilateral = current?.exercise.laterality === 'unilateral';
    const isDuration = current?.exercise.measurement_type === 'duration';

    // Auto-stop + countdown sounds when target duration is reached (bilateral)
    useEffect(() => {
        const target = current?.target_duration_seconds ?? 0;
        if (!isDuration || isUnilateral || target === 0) return;

        const remaining = target - exerciseDuration;
        if (remaining > 0 && remaining <= 3) {
            playTickSound();
        } else if (remaining === 0) {
            playEndSound();
        }
        if (remaining <= 0) {
            stopExerciseTimer();
            setExerciseDuration(target); // keep duration at target so hasInput stays true
        }
    }, [exerciseDuration, current?.target_duration_seconds, isDuration, isUnilateral]);

    // Auto-stop + sounds for unilateral side timers
    useEffect(() => {
        const target = current?.target_duration_seconds ?? 0;
        if (!isDuration || !isUnilateral || target === 0) return;

        const checkSide = (side: "left" | "right", duration: number) => {
            const remaining = target - duration;
            if (remaining > 0 && remaining <= 3) {
                playTickSound();
            } else if (remaining === 0) {
                playEndSound();
            }
            if (remaining <= 0) {
                stopExerciseTimerSide();
                if (side === 'left') setExerciseDurationLeft(target);
                else setExerciseDurationRight(target);
            }
        };

        if (exerciseTimerActiveSide === 'left') {
            checkSide('left', exerciseDurationLeft);
        } else if (exerciseTimerActiveSide === 'right') {
            checkSide('right', exerciseDurationRight);
        }
    }, [exerciseDurationLeft, exerciseDurationRight, exerciseTimerActiveSide, current?.target_duration_seconds, isDuration, isUnilateral]);



    return children;
}