import { getCategoryLabel, type CategoryI18n } from '@/constants/category-labels';
import { ENV_ICONS } from '@/constants/environment-icons';
import { computeLoadProfile } from '@/lib/load-profile';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { UserProfile } from '@/providers/current-user-provider';
import { SessionDuration } from '@/types/database';
import { AmbiguousItem, CategoryItem, EnvItem, EquipmentItem, Phase } from '@/types/plan-generation';
import { WeeklyScheduleSession } from '@/types/user-data';
import { type ImperativeRouter } from 'expo-router';
import i18next from 'i18next';
import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';

type GoalsSubPhase = 'select' | 'rank';

export type PlanWizardState = {
    // Navigation
    phase: Phase;
    goalsSubPhase: GoalsSubPhase;

    // UI status
    loading: boolean;
    isSaving: boolean;
    saveError: string | null;

    // Stored profile context
    profileId: string | null;
    originalSportSlug: string | null;

    // Sport
    selectedSportSlug: string | null;

    // Environment
    allEnvs: EnvItem[];
    selectedEnvIds: Set<string>;
    equipmentByEnv: Map<string, EquipmentItem[]>;

    // Equipment
    allEquipment: EquipmentItem[];
    selectedEquipmentIds: Set<string>;

    // Equipment-environment mapping
    ambiguousEquipment: AmbiguousItem[];
    equipmentEnvSelections: Map<string, Set<string>>;
    savedEquipmentEnvMappings: { equipment_id: string; environment_id: string }[];

    // Goals
    allCategories: CategoryItem[];
    selectedCategoryIds: Set<string>;
    rankedCategories: CategoryItem[];

    // Body
    weightKg: number;
    heightCm: number;
    weightUnit: 'kg' | 'lbs';
    heightUnit: 'cm' | 'ft';

    // Schedule
    preferredDays: Set<number>;
    preferredDuration: SessionDuration | null;
    scheduleNotes: string;
    dayEnvMap: Record<number, string>;

    // Weekly sport schedule
    sportSessions: WeeklyScheduleSession[];

    // Actions
    initialize: (profile: UserProfile) => Promise<void>;
    toggleEnv: (id: string) => void;
    goToEquipment: () => void;
    toggleEquipment: (id: string) => void;
    handleEquipmentNext: () => void;
    toggleEquipmentEnv: (equipmentId: string, envId: string) => void;
    toggleCategory: (id: string) => void;
    setRankedCategories: (items: CategoryItem[]) => void;
    togglePreferredDay: (dow: number) => void;
    toggleDayEnv: (dow: number, envId: string) => void;
    toggleSportDay: (day: number) => void;
    setSportType: (day: number, type: WeeklyScheduleSession['type']) => void;
    setSportIntensity: (day: number, intensity: number) => void;
    setSelectedSportSlug: (slug: string | null) => void;
    setWeightKg: (kg: number) => void;
    setHeightCm: (cm: number) => void;
    setWeightUnit: (unit: 'kg' | 'lbs') => void;
    setHeightUnit: (unit: 'cm' | 'ft') => void;
    setPreferredDuration: (duration: SessionDuration | null) => void;
    setScheduleNotes: (notes: string) => void;
    goBack: (router: ImperativeRouter) => void;
    goNext: () => void;
    generate: (router: ImperativeRouter) => Promise<void>;
    reset: () => void;
};

const initialState = {
    phase: 'sport' as Phase,
    goalsSubPhase: 'select' as GoalsSubPhase,
    loading: true,
    isSaving: false,
    saveError: null,
    profileId: null,
    originalSportSlug: null,
    selectedSportSlug: null,
    allEnvs: [],
    selectedEnvIds: new Set<string>(),
    equipmentByEnv: new Map<string, EquipmentItem[]>(),
    allEquipment: [],
    selectedEquipmentIds: new Set<string>(),
    ambiguousEquipment: [],
    equipmentEnvSelections: new Map<string, Set<string>>(),
    savedEquipmentEnvMappings: [] as { equipment_id: string; environment_id: string }[],
    allCategories: [],
    selectedCategoryIds: new Set<string>(),
    rankedCategories: [],
    weightKg: 75,
    heightCm: 175,
    weightUnit: 'kg' as const,
    heightUnit: 'cm' as const,
    preferredDays: new Set([1, 2, 3, 4, 5, 6, 7]),
    preferredDuration: null,
    scheduleNotes: '',
    dayEnvMap: {} as Record<number, string>,
    sportSessions: [] as WeeklyScheduleSession[],
};

export const usePlanWizardStore = create<PlanWizardState>((set, get) => ({
    ...initialState,

    initialize: async (profile) => {
        set({
            phase: 'sport',
            loading: true,
            profileId: profile.id,
            originalSportSlug: profile.sport?.slug ?? null,
            selectedSportSlug: profile.sport?.slug ?? null,
            weightKg: profile.weight_in_kg ?? 75,
            heightCm: profile.height_in_cm ?? 175,
            preferredDays: profile.preferred_workout_days?.length
                ? new Set(profile.preferred_workout_days)
                : new Set([1, 2, 3, 4, 5, 6, 7]),
            preferredDuration: profile.preferred_session_duration ?? null,
            scheduleNotes: profile.schedule_notes ?? '',
            sportSessions: (profile as any).weekly_schedule?.sessions ?? [],
        });

        const savedDayEnvs = (profile as any).day_environments as { day_of_week: number; environment_id: string }[] | null;
        if (savedDayEnvs?.length) {
            const map: Record<number, string> = {};
            savedDayEnvs.forEach(de => { map[de.day_of_week] = de.environment_id; });
            set({ dayEnvMap: map });
        } else {
            set({ dayEnvMap: {} });
        }

        const [envsRes, userEquipRes, envEqRes, catsRes, targetedRes, userEnvsRes, userEqEnvRes] = await Promise.all([
            supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', profile.id),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
            supabase.from('categories').select('id, slug, name_i18n'),
            supabase.from('user_targeted_categories').select('category_id, priority').eq('user_id', profile.id).order('priority'),
            supabase.from('user_environments').select('environment_id').eq('user_id', profile.id),
            (supabase as any).from('user_equipment_environments').select('equipment_id, environment_id').eq('user_id', profile.id),
        ]);

        const t = i18next.t.bind(i18next);

        const catItems: CategoryItem[] = (catsRes.data ?? []).map(c => ({
            id: c.id,
            slug: c.slug,
            name_i18n: c.name_i18n as CategoryI18n,
            label: getCategoryLabel(c.slug, t, c.name_i18n as CategoryI18n),
        }));

        let selectedCategoryIds = new Set<string>();
        let rankedCategories: CategoryItem[] = [];

        if (targetedRes.data?.length) {
            selectedCategoryIds = new Set(targetedRes.data.map(r => r.category_id));
            rankedCategories = targetedRes.data
                .sort((a, b) => a.priority - b.priority)
                .map(r => catItems.find(c => c.id === r.category_id)!)
                .filter(Boolean);
        }

        const currentEquipIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));

        const byEnv = new Map<string, EquipmentItem[]>();
        for (const row of envEqRes.data ?? []) {
            const eq = (row.equipment as any);
            if (!eq) continue;
            if (!byEnv.has(row.environment_id)) byEnv.set(row.environment_id, []);
            byEnv.get(row.environment_id)!.push({
                id: eq.id,
                slug: eq.slug,
                name_i18n: eq.name_i18n as Record<string, string> | null,
            });
        }

        let selectedEnvIds = new Set<string>();

        if (envsRes.data) {
            const envItems: EnvItem[] = envsRes.data.map(e => ({
                id: e.id,
                slug: e.slug,
                icon: ENV_ICONS[e.slug] ?? 'location-outline',
                name_i18n: e.name_i18n as Record<string, string> | null,
                description_i18n: e.description_i18n as Record<string, string> | null,
            }));

            const savedEnvIds = (userEnvsRes.data ?? []).map(r => r.environment_id);
            if (savedEnvIds.length > 0) {
                selectedEnvIds = new Set(savedEnvIds);
            } else if (currentEquipIds.size > 0) {
                const { data: envEqRows } = await supabase
                    .from('environment_equipments')
                    .select('environment_id')
                    .in('equipment_id', [...currentEquipIds]);
                if (envEqRows) {
                    selectedEnvIds = new Set(envEqRows.map(r => r.environment_id));
                }
            }

            set({
                allEnvs: envItems,
                selectedEnvIds,
                equipmentByEnv: byEnv,
                allCategories: catItems,
                selectedCategoryIds,
                rankedCategories,
                goalsSubPhase: 'select',
                selectedEquipmentIds: currentEquipIds,
                savedEquipmentEnvMappings: userEqEnvRes.data ?? [],
                loading: false,
            });
        }
    },

    // Placeholder actions — implemented in Task 2
    toggleEnv: () => {},
    goToEquipment: () => {},
    toggleEquipment: () => {},
    handleEquipmentNext: () => {},
    toggleEquipmentEnv: () => {},
    toggleCategory: () => {},
    setRankedCategories: () => {},
    togglePreferredDay: () => {},
    toggleDayEnv: () => {},
    toggleSportDay: () => {},
    setSportType: () => {},
    setSportIntensity: () => {},
    setSelectedSportSlug: () => {},
    setWeightKg: () => {},
    setHeightCm: () => {},
    setWeightUnit: () => {},
    setHeightUnit: () => {},
    setPreferredDuration: () => {},
    setScheduleNotes: () => {},
    goBack: () => {},
    goNext: () => {},
    generate: async () => {},
    reset: () => set({ ...initialState }),
}));
