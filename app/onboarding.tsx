import { OnboardingProgressWrapper } from '@/components/onboarding/onboarding-progress-wrapper';
import { OnboardingStep } from '@/components/onboarding/types';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';

const steps: OnboardingStep[] = [
    {
        component: CompleteStep,
        continueButtonText: 'Los geht\'s',
        theme: 'dark',
    },
];

export default function OnboardingScreen() {
    return <OnboardingProgressWrapper steps={steps} />;
}
