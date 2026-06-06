import { ComponentType } from 'react';

export type OnboardingStep = {
    component: ComponentType;
    showProgressIndicator?: boolean;
    showContinueButton?: boolean;
    continueButtonText?: string;
    initialCanContinue?: boolean;
    preContinue?: () => Promise<void>;
    shouldSkip?: () => boolean;
    theme?: 'dark' | 'light';
};
