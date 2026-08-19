import { OnboardingProgressWrapper } from '@/components/onboarding/onboarding-progress-wrapper';
import { getSportKind } from '@/constants/sports';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { getATTStatus } from '@/utils/get-att-status';
import { AttributionStep } from '@/components/onboarding/steps/attribution-step';
import { BirthdayStep } from '@/components/onboarding/steps/birthday-step';
import { BodyStep } from '@/components/onboarding/steps/body-step';
import { CategoryFocusStep } from '@/components/onboarding/steps/category-focus-step';
import { CategoryLevelStep } from '@/components/onboarding/steps/category-level-step';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';
import { EnvironmentStep } from '@/components/onboarding/steps/environment-step';
import { EquipmentStep } from '@/components/onboarding/steps/equipment-step';
import { EquipmentEnvironmentStep } from '@/components/onboarding/steps/equipment-environment-step';
import { GenderStep } from '@/components/onboarding/steps/gender-step';
import { InjuriesStep } from '@/components/onboarding/steps/injuries-step';
import { NameStep } from '@/components/onboarding/steps/name-step';
import { NotificationSetupStep } from '@/components/onboarding/steps/notification-setup-step';
import { PersonalizationStep } from '@/components/onboarding/steps/personalization-step';
import { RatingStep } from '@/components/onboarding/steps/rating-step';
import { ReferralCodeStep } from '@/components/onboarding/steps/referral-code-step';
import { SportStep } from '@/components/onboarding/steps/sport-step';
import { TrackingStep } from '@/components/onboarding/steps/tracking-step';
import { TrialOfferStep } from '@/components/onboarding/steps/trial-offer-step';
import { PlanReadyStep } from '@/components/onboarding/steps/plan-ready-step';
import { WelcomeStep } from '@/components/onboarding/steps/welcome-step';
import { WorkoutPrefsStep } from '@/components/onboarding/steps/workout-prefs-step';
import { WeeklyScheduleStep } from '@/components/onboarding/steps/weekly-schedule-step';
import { OnboardingStep } from '@/components/onboarding/types';
import { useTranslation } from 'react-i18next';

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const equipmentIds = useOnboardingStore((s) => s.equipmentIds);

    const steps: OnboardingStep[] = [

        { component: WelcomeStep, theme: 'dark', showProgressIndicator: false, showContinueButton: false },
        {
            component: TrackingStep, theme: 'dark', initialCanContinue: true,
            preContinue: async () => {
                const status = await getATTStatus();
                const attStatus = status === 'granted' ? 'authorized' : 'declined';
                trackerManager.track('tracking_permission', {
                    status: attStatus,
                    $set: { att_status: attStatus },
                });
            },
        },
        { component: AttributionStep, theme: 'dark', initialCanContinue: false },
        { component: NameStep, theme: 'dark', initialCanContinue: false },
        {
            component: BirthdayStep, theme: 'dark', initialCanContinue: false,
            // Alter + Altersgruppe als PostHog-Person-Property — feuert genau
            // einmal beim Weiterklicken statt bei jedem Wheel-Tick
            preContinue: async () => {
                const birthDate = useOnboardingStore.getState().birth_date;
                if (!birthDate) return;
                const birth = new Date(birthDate);
                const now = new Date();
                let age = now.getFullYear() - birth.getFullYear();
                if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
                const ageGroup = age < 18 ? '<18'
                    : age <= 24 ? '18-24'
                        : age <= 30 ? '25-30'
                            : age <= 50 ? '31-50'
                                : '50+';
                trackerManager.track('onboarding_age_selected', {
                    age,
                    age_group: ageGroup,
                    $set: { age, age_group: ageGroup },
                });
            },
        },
        { component: GenderStep, theme: 'dark', initialCanContinue: false },
        { component: BodyStep, theme: 'dark', initialCanContinue: false },
        // Config-Reihenfolge spiegelt den Plan-Wizard: Orte → Equipment →
        // Zuordnung → Ziele → Sport-Woche → Trainingstage (mit Sport-Hints) → Verletzungen
        {
            component: SportStep, theme: 'dark', initialCanContinue: false,
            // Sport als PostHog-Person-Property — Auswertungen nach Sportart
            preContinue: async () => {
                const sportSlug = useOnboardingStore.getState().sport_slug;
                if (!sportSlug) return;
                trackerManager.track('onboarding_sport_selected', {
                    sport: sportSlug,
                    sport_kind: getSportKind(sportSlug),
                    $set: { sport: sportSlug, sport_kind: getSportKind(sportSlug) },
                });
            },
        },
        { component: CategoryLevelStep, theme: 'dark', initialCanContinue: true },
        { component: EnvironmentStep, theme: 'dark', initialCanContinue: false },
        { component: EquipmentStep, theme: 'dark', initialCanContinue: true },
        { component: EquipmentEnvironmentStep, theme: 'dark', initialCanContinue: true, shouldSkip: () => environmentIds.length <= 1 || equipmentIds.length === 0 },
        { component: CategoryFocusStep, theme: 'dark', initialCanContinue: false },
        { component: WeeklyScheduleStep, theme: 'dark', initialCanContinue: true },
        { component: WorkoutPrefsStep, theme: 'dark', initialCanContinue: false },
        { component: InjuriesStep, theme: 'dark', initialCanContinue: true },
        // Notifications + Review erst NACH den Eingaben — der User ist
        // investiert und sagt eher Ja. Kein Continue beim Mock-Dialog:
        // der triggert den echten Prompt und navigiert selbst weiter
        { component: NotificationSetupStep, theme: 'dark', showContinueButton: false },
        { component: RatingStep, theme: 'dark', initialCanContinue: true },
        { component: CompleteStep, theme: 'dark', continueButtonText: t('onboarding.btn_create_plan') },
        { component: PersonalizationStep, theme: 'dark', showProgressIndicator: false, showContinueButton: false },
        { component: ReferralCodeStep, theme: 'dark', initialCanContinue: true },
        // Plan-Teaser vor der Paywall: „Dein Plan steht" mit echten Daten
        { component: PlanReadyStep, theme: 'dark', initialCanContinue: true, continueButtonText: t('onboarding.plan_ready_cta') },
        { component: TrialOfferStep, theme: 'dark', continueButtonText: t('onboarding.btn_try_free') },
    ];

    return <OnboardingProgressWrapper steps={steps} />;
}
