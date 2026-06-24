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

    toggleEnv: (id) => {
        set(state => {
            const next = new Set(state.selectedEnvIds);
            next.has(id) ? next.delete(id) : next.add(id);
            return { selectedEnvIds: next };
        });
    },

    goToEquipment: () => {
        const { selectedEnvIds, equipmentByEnv } = get();
        const map = new Map<string, EquipmentItem>();
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (!map.has(eq.id)) map.set(eq.id, eq);
            }
        }
        set({
            allEquipment: [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
            phase: 'equipment',
        });
    },

    toggleEquipment: (id) => {
        set(state => {
            const next = new Set(state.selectedEquipmentIds);
            next.has(id) ? next.delete(id) : next.add(id);
            return { selectedEquipmentIds: next };
        });
    },

    handleEquipmentNext: () => {
        const { selectedEnvIds, equipmentByEnv, selectedEquipmentIds, allEquipment, savedEquipmentEnvMappings } = get();

        const eqToEnvs = new Map<string, Set<string>>();
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (!selectedEquipmentIds.has(eq.id)) continue;
                if (!eqToEnvs.has(eq.id)) eqToEnvs.set(eq.id, new Set());
                eqToEnvs.get(eq.id)!.add(envId);
            }
        }

        const selections = new Map<string, Set<string>>();
        const ambiguous: AmbiguousItem[] = [];

        const savedByEq = new Map<string, Set<string>>();
        for (const m of savedEquipmentEnvMappings) {
            if (!savedByEq.has(m.equipment_id)) savedByEq.set(m.equipment_id, new Set());
            savedByEq.get(m.equipment_id)!.add(m.environment_id);
        }

        for (const [eqId, envIds] of eqToEnvs) {
            if (envIds.size > 1) {
                const eqItem = allEquipment.find(e => e.id === eqId);
                if (eqItem) {
                    ambiguous.push({ id: eqId, slug: eqItem.slug, name_i18n: eqItem.name_i18n, compatibleEnvIds: [...envIds] });
                }
                selections.set(eqId, savedByEq.get(eqId) ?? new Set(envIds));
            } else {
                selections.set(eqId, new Set(envIds));
            }
        }

        set({ equipmentEnvSelections: selections });

        if (ambiguous.length === 0) {
            set({ goalsSubPhase: 'select', phase: 'goals' });
        } else {
            set({ ambiguousEquipment: ambiguous, phase: 'equipment-env' });
        }
    },

    toggleEquipmentEnv: (equipmentId, envId) => {
        set(state => {
            const next = new Map(state.equipmentEnvSelections);
            const envSet = new Set(next.get(equipmentId) ?? []);
            envSet.has(envId) ? envSet.delete(envId) : envSet.add(envId);
            next.set(equipmentId, envSet);
            return { equipmentEnvSelections: next };
        });
    },

    toggleCategory: (id) => {
        set(state => {
            const next = new Set(state.selectedCategoryIds);
            next.has(id) ? next.delete(id) : next.add(id);
            return { selectedCategoryIds: next };
        });
    },

    setRankedCategories: (items) => set({ rankedCategories: items }),

    togglePreferredDay: (dow) => {
        set(state => {
            const next = new Set(state.preferredDays);
            if (next.has(dow) && next.size <= 2) return state; // minimum 2 days
            let dayEnvMap = state.dayEnvMap;
            if (next.has(dow)) {
                dayEnvMap = { ...dayEnvMap };
                delete dayEnvMap[dow];
            }
            next.has(dow) ? next.delete(dow) : next.add(dow);
            return { preferredDays: next, dayEnvMap };
        });
    },

    toggleDayEnv: (dow, envId) => {
        set(state => {
            const next = { ...state.dayEnvMap };
            if (next[dow] === envId) delete next[dow];
            else next[dow] = envId;
            return { dayEnvMap: next };
        });
    },

    toggleSportDay: (day) => {
        set(state => {
            const exists = state.sportSessions.find(s => s.day_of_week === day);
            if (exists) {
                return { sportSessions: state.sportSessions.filter(s => s.day_of_week !== day) };
            }
            return { sportSessions: [...state.sportSessions, { day_of_week: day, type: 'team_training', intensity: 6 }] };
        });
    },

    setSportType: (day, type) => {
        set(state => ({
            sportSessions: state.sportSessions.map(s => s.day_of_week === day ? { ...s, type } : s),
        }));
    },

    setSportIntensity: (day, intensity) => {
        set(state => ({
            sportSessions: state.sportSessions.map(s => s.day_of_week === day ? { ...s, intensity } : s),
        }));
    },

    setSelectedSportSlug: (slug) => set({ selectedSportSlug: slug }),
    setWeightKg: (kg) => set({ weightKg: kg }),
    setHeightCm: (cm) => set({ heightCm: cm }),
    setWeightUnit: (unit) => set({ weightUnit: unit }),
    setHeightUnit: (unit) => set({ heightUnit: unit }),
    setPreferredDuration: (duration) => set({ preferredDuration: duration }),
    setScheduleNotes: (notes) => set({ scheduleNotes: notes }),
    goBack: (router) => {
        const { phase, goalsSubPhase, ambiguousEquipment, selectedCategoryIds } = get();
        if (phase === 'sport') { router.back(); return; }
        if (phase === 'environment') { set({ phase: 'sport' }); return; }
        if (phase === 'equipment') { set({ phase: 'environment' }); return; }
        if (phase === 'equipment-env') { set({ phase: 'equipment' }); return; }
        if (phase === 'goals') {
            if (goalsSubPhase === 'rank') { set({ goalsSubPhase: 'select' }); return; }
            set({ phase: ambiguousEquipment.length > 0 ? 'equipment-env' : 'equipment' });
            return;
        }
        if (phase === 'body') {
            if (selectedCategoryIds.size <= 1) set({ goalsSubPhase: 'select' });
            set({ phase: 'goals' });
            return;
        }
        if (phase === 'schedule') { set({ phase: 'body' }); return; }
        if (phase === 'weekly') { set({ phase: 'schedule' }); return; }
    },

    goNext: () => {
        const { phase, goalsSubPhase, allCategories, selectedCategoryIds } = get();
        if (phase === 'sport') { set({ phase: 'environment' }); return; }
        if (phase === 'environment') { get().goToEquipment(); return; }
        if (phase === 'equipment') { get().handleEquipmentNext(); return; }
        if (phase === 'equipment-env') { set({ goalsSubPhase: 'select', phase: 'goals' }); return; }
        if (phase === 'goals') {
            if (goalsSubPhase === 'select') {
                const selected = allCategories.filter(c => selectedCategoryIds.has(c.id));
                if (selected.length > 1) {
                    set({ rankedCategories: selected, goalsSubPhase: 'rank' });
                } else {
                    set({ rankedCategories: selected, phase: 'body' });
                }
                return;
            }
            set({ phase: 'body' });
            return;
        }
        if (phase === 'body') { set({ phase: 'schedule' }); return; }
        if (phase === 'schedule') { set({ phase: 'weekly' }); return; }
    },

    generate: async (router) => {
        const {
            profileId, originalSportSlug, selectedSportSlug,
            selectedEnvIds, selectedEquipmentIds, equipmentEnvSelections,
            rankedCategories, preferredDays, preferredDuration,
            scheduleNotes, sportSessions, dayEnvMap,
            weightKg, heightCm,
        } = get();

        if (!profileId) return;

        try {
            set({ isSaving: true, saveError: null });

            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) throw new Error('No auth session');

            if (authSession?.user?.id) {
                usePlanGenerationStore.getState().subscribe(authSession.user.id);
            }

            // 1. Update sport if changed
            if (selectedSportSlug && selectedSportSlug !== originalSportSlug) {
                const { data: sportRow } = await supabase
                    .from('sports').select('id').eq('slug', selectedSportSlug).single();
                if (sportRow) {
                    await supabase.from('user_profiles')
                        .update({ sport_id: sportRow.id })
                        .eq('id', profileId);
                }
            }

            // 2. Update weight / height
            await supabase.from('user_profiles').update({
                ...(weightKg > 0 && { weight_in_kg: weightKg }),
                ...(heightCm > 0 && { height_in_cm: heightCm }),
            }).eq('id', profileId);

            // 3. Update environments
            await supabase.from('user_environments').delete().eq('user_id', profileId);
            if (selectedEnvIds.size > 0) {
                await supabase.from('user_environments').insert(
                    [...selectedEnvIds].map(environment_id => ({ user_id: profileId, environment_id }))
                );
            }

            // 4. Update equipment
            await supabase.from('user_equipments').delete().eq('user_id', profileId);
            if (selectedEquipmentIds.size > 0) {
                await supabase.from('user_equipments').insert(
                    [...selectedEquipmentIds].map(equipment_id => ({ user_id: profileId, equipment_id }))
                );
            }

            // 4b. Update equipment-environment mapping
            await (supabase as any).from('user_equipment_environments').delete().eq('user_id', profileId);
            const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
            for (const [equipmentId, envIds] of equipmentEnvSelections) {
                if (selectedEquipmentIds.has(equipmentId)) {
                    for (const envId of envIds) {
                        equipEnvRows.push({ user_id: profileId, equipment_id: equipmentId, environment_id: envId });
                    }
                }
            }
            if (equipEnvRows.length > 0) {
                await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
            }

            // 5. Update goals
            await supabase.from('user_targeted_categories').delete().eq('user_id', profileId);
            if (rankedCategories.length > 0) {
                await supabase.from('user_targeted_categories').insert(
                    rankedCategories.map((cat, i) => ({ user_id: profileId, category_id: cat.id, priority: i + 1 }))
                );
            }

            // 6. Update schedule
            const { load_score, load_profile } = computeLoadProfile(sportSessions);
            await supabase.from('user_profiles')
                .update({
                    preferred_workout_days: [...preferredDays].sort((a, b) => a - b),
                    preferred_session_duration: preferredDuration,
                    schedule_notes: scheduleNotes.trim() || null,
                    weekly_schedule: { sessions: sportSessions, notes: null } as any,
                    day_environments: Object.entries(dayEnvMap).map(([day, environment_id]) => ({
                        day_of_week: Number(day),
                        environment_id,
                    })) as any,
                    load_score,
                    load_profile,
                })
                .eq('id', profileId);

            // 7. Trigger plan generation
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/plan-generation/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authSession?.access_token}` },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error ?? `HTTP ${res.status}`);
            }

            set({ isSaving: false });
            router.back();
            router.navigate('/(tabs)/plan');
        } catch (err: any) {
            set({ isSaving: false, saveError: err?.message ?? 'Unknown error' });
            console.error('generate error:', err?.message);
        }
    },

    reset: () => set({ ...initialState }),
}));
