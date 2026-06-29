import { useActiveSessionStore } from '@/stores/active-session-store';
import { createContext, useCallback, useContext, useState } from 'react';
import {
    Easing,
    runOnJS,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';

type ActiveSessionTransitionContextType = {
    exerciseIdx: number;
    currentSet: number;
    setExerciseIdx: (idx: number) => void;
    setCurrentSet: (set: number) => void;
    // Updates crash-recovery store + local state immediately (for skip, no animation)
    saveProgress: (exIdx: number, setNum: number) => void;
    // SharedValues for animated components
    exSlideX: SharedValue<number>;
    exOpacity: SharedValue<number>;
    setSlideX: SharedValue<number>;
    setOpacity: SharedValue<number>;
    // Slide helpers — called from JS thread, update state at animation midpoint
    slideOutExercise: (onMidpoint: () => void) => void;
    slideOutSet: (onMidpoint: () => void) => void;
};

const ActiveSessionTransitionContext = createContext<ActiveSessionTransitionContextType | null>(null);

export function ActiveSessionTransitionProvider({ children }: { children: React.ReactNode }) {
    const store = useActiveSessionStore();

    const [exerciseIdx, setExerciseIdx] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);

    const exSlideX = useSharedValue(0);
    const exOpacity = useSharedValue(1);
    const setSlideX = useSharedValue(0);
    const setOpacity = useSharedValue(1);

    const saveProgress = useCallback((exIdx: number, setNum: number) => {
        store.setProgress(exIdx, setNum);
        setExerciseIdx(exIdx);
        setCurrentSet(setNum);
    }, [store]);

    const slideOutExercise = useCallback((onMidpoint: () => void) => {
        exSlideX.value = withTiming(-40, { duration: 100, easing: Easing.in(Easing.ease) }, (done) => {
            'worklet';
            if (done) {
                exSlideX.value = 24;
                exOpacity.value = 0;
                exSlideX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
                exOpacity.value = withTiming(1, { duration: 220 });
                runOnJS(onMidpoint)();
            }
        });
        exOpacity.value = withTiming(0, { duration: 100 });
    }, [exSlideX, exOpacity]);

    const slideOutSet = useCallback((onMidpoint: () => void) => {
        setSlideX.value = withTiming(-24, { duration: 100, easing: Easing.in(Easing.ease) }, (done) => {
            'worklet';
            if (done) {
                setSlideX.value = 14;
                setOpacity.value = 0;
                setSlideX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
                setOpacity.value = withTiming(1, { duration: 220 });
                runOnJS(onMidpoint)();
            }
        });
        setOpacity.value = withTiming(0, { duration: 100 });
    }, [setSlideX, setOpacity]);

    return (
        <ActiveSessionTransitionContext.Provider value={{
            exerciseIdx,
            currentSet,
            setExerciseIdx,
            setCurrentSet,
            saveProgress,
            exSlideX,
            exOpacity,
            setSlideX,
            setOpacity,
            slideOutExercise,
            slideOutSet,
        }}>
            {children}
        </ActiveSessionTransitionContext.Provider>
    );
}

export const useActiveSessionTransition = () => {
    const ctx = useContext(ActiveSessionTransitionContext);
    if (!ctx) throw new Error('useActiveSessionTransition must be used within ActiveSessionTransitionProvider');
    return ctx;
};
