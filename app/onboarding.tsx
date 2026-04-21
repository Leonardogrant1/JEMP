import { OnboardingProgressWrapper } from '@/components/onboarding/onboarding-progress-wrapper';
import { OnboardingStep } from '@/components/onboarding/types';
import { NameStep } from '@/components/onboarding/steps/name-step';
import { BirthdayStep } from '@/components/onboarding/steps/birthday-step';
import { GenderStep } from '@/components/onboarding/steps/gender-step';
import { BodyStep } from '@/components/onboarding/steps/body-step';
import { SportStep } from '@/components/onboarding/steps/sport-step';
import { CategoryFocusStep } from '@/components/onboarding/steps/category-focus-step';
import { CategoryLevelStep } from '@/components/onboarding/steps/category-level-step';
import { EnvironmentStep } from '@/components/onboarding/steps/environment-step';
import { EquipmentStep } from '@/components/onboarding/steps/equipment-step';
import { WorkoutPrefsStep } from '@/components/onboarding/steps/workout-prefs-step';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';

const steps: OnboardingStep[] = [
    { component: NameStep, theme: 'dark', initialCanContinue: false },
    { component: BirthdayStep, theme: 'dark', initialCanContinue: false },
    { component: GenderStep, theme: 'dark', initialCanContinue: false },
    { component: BodyStep, theme: 'dark', initialCanContinue: false },
    { component: SportStep, theme: 'dark', initialCanContinue: false },
    { component: CategoryFocusStep, theme: 'dark', initialCanContinue: false },
    { component: CategoryLevelStep, theme: 'dark', initialCanContinue: true },
    { component: EnvironmentStep, theme: 'dark', initialCanContinue: false },
    { component: EquipmentStep, theme: 'dark', initialCanContinue: true },
    { component: WorkoutPrefsStep, theme: 'dark', initialCanContinue: false },
    { component: CompleteStep, theme: 'dark', continueButtonText: 'Los geht\'s' },
];

export default function OnboardingScreen() {
    return <OnboardingProgressWrapper steps={steps} />;
}
