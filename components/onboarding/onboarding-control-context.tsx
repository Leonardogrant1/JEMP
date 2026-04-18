import { createContext, useContext } from 'react';

type OnboardingControlContextValue = {
    currentIndex: number;
    canContinue: boolean;
    setCanContinue: (value: boolean) => void;
    setOnDisabledPress: (fn: () => void) => void;
    nextStep: () => void;
    finishOnboarding: () => void;
    visionDescription: string;
    setVisionDescription: (value: string) => void;
};

export const OnboardingControlContext = createContext<OnboardingControlContextValue | null>(null);

export function useOnboardingControl() {
    const ctx = useContext(OnboardingControlContext);
    if (!ctx) throw new Error('useOnboardingControl must be used within OnboardingProgressWrapper');
    return ctx;
}
