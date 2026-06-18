import { OnboardingProgressWrapper } from '@/components/onboarding/onboarding-progress-wrapper';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { getATTStatus } from '@/utils/get-att-status';
import { BirthdayStep } from '@/components/onboarding/steps/birthday-step';
import { BodyStep } from '@/components/onboarding/steps/body-step';
import { CategoryFocusStep } from '@/components/onboarding/steps/category-focus-step';
import { CategoryLevelStep } from '@/components/onboarding/steps/category-level-step';
import { CategoryPriorityStep } from '@/components/onboarding/steps/category-priority-step';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';
import { EnvironmentStep } from '@/components/onboarding/steps/environment-step';
import { EquipmentStep } from '@/components/onboarding/steps/equipment-step';
import { EquipmentEnvironmentStep } from '@/components/onboarding/steps/equipment-environment-step';
import { GenderStep } from '@/components/onboarding/steps/gender-step';
import { NameStep } from '@/components/onboarding/steps/name-step';
import { NotificationSetupStep } from '@/components/onboarding/steps/notification-setup-step';
import { PlanGenerationStep } from '@/components/onboarding/steps/plan-generation-step';
import { PersonalizationStep } from '@/components/onboarding/steps/personalization-step';
import { RatingStep } from '@/components/onboarding/steps/rating-step';
import { ReferralCodeStep } from '@/components/onboarding/steps/referral-code-step';
import { SportStep } from '@/components/onboarding/steps/sport-step';
import { TrackingStep } from '@/components/onboarding/steps/tracking-step';
import { TrialOfferStep } from '@/components/onboarding/steps/trial-offer-step';
import { WelcomeStep } from '@/components/onboarding/steps/welcome-step';
import { WhatYouWillGetStep } from '@/components/onboarding/steps/what-you-will-get-step';
import { WorkoutPrefsStep } from '@/components/onboarding/steps/workout-prefs-step';
import { WeeklyScheduleStep } from '@/components/onboarding/steps/weekly-schedule-step';
import { OnboardingStep } from '@/components/onboarding/types';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { useTranslation } from 'react-i18next';

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const targetedCategories = useOnboardingStore((s) => s.targetedCategories);

    const steps: OnboardingStep[] = [

        { component: WelcomeStep, theme: 'dark', showProgressIndicator: false, showContinueButton: false },
        {
            component: TrackingStep, theme: 'dark', initialCanContinue: true,
            preContinue: async () => {
                const status = await getATTStatus();
                trackerManager.track('tracking_permission', {
                    status: status === 'granted' ? 'authorized' : 'declined',
                });
            },
        },
        { component: RatingStep, theme: 'dark', initialCanContinue: true },
        { component: NameStep, theme: 'dark', initialCanContinue: false },
        { component: BirthdayStep, theme: 'dark', initialCanContinue: false },
        { component: GenderStep, theme: 'dark', initialCanContinue: false },
        { component: BodyStep, theme: 'dark', initialCanContinue: false },
        { component: SportStep, theme: 'dark', initialCanContinue: false },
        { component: CategoryLevelStep, theme: 'dark', initialCanContinue: true },
        { component: CategoryFocusStep, theme: 'dark', initialCanContinue: false },
        { component: CategoryPriorityStep, theme: 'dark', initialCanContinue: true, shouldSkip: () => targetedCategories.length <= 1 },
        { component: EnvironmentStep, theme: 'dark', initialCanContinue: false },
        { component: EquipmentStep, theme: 'dark', initialCanContinue: true },
        { component: EquipmentEnvironmentStep, theme: 'dark', initialCanContinue: true },
        { component: WorkoutPrefsStep, theme: 'dark', initialCanContinue: false },
        { component: WeeklyScheduleStep, theme: 'dark', initialCanContinue: true },
        { component: CompleteStep, theme: 'dark', continueButtonText: t('onboarding.btn_create_plan') },
        { component: PersonalizationStep, theme: 'dark', showProgressIndicator: false, showContinueButton: false },
        {
            component: NotificationSetupStep,
            theme: 'dark',
            initialCanContinue: true,
            preContinue: async () => {
                await Notifications.requestPermissionsAsync();
            },
        },
        { component: ReferralCodeStep, theme: 'dark', initialCanContinue: true },
        { component: WhatYouWillGetStep, theme: 'dark', initialCanContinue: true },
        { component: TrialOfferStep, theme: 'dark', continueButtonText: t('onboarding.btn_try_free') },
    ];

    return <OnboardingProgressWrapper steps={steps} />;
}
