import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { MODE_WEIGHTS, SESSION_MODE_DURATION } from "./constants.ts";
import { PlanGenerationInput, SessionModeSlug } from "./types.ts";



export class PlanGenerator {
    private generationInput: PlanGenerationInput;
    private openAI: OpenAI;
    private supabase: SupabaseClient;


    get envIds() {
        return new Set(this.generationInput.environment_ids);
    }

    get envSlugs() {
        return new Set(this.generationInput.environment_slugs);
    }

    get userEquipmentIds() {
        return new Set(this.generationInput.equipment_ids);
    }

    get categoryLevels() {
        return new Map(this.generationInput.category_levels.map((cl) => [cl.category_id, cl.level_score]));
    }

    get sportRequiredCategories() {
        return this.generationInput.sport_required_categories;
    }

    get userFocusCategories() {
        return this.generationInput.user_focus_categories;
    }



    get envSlugMap() {
        return new Map<string, string>((this.exerciseData.allEnvironments ?? []).map((r: any) => [r.id, r.slug]))
    }

    get exerciseEnvMap() {
        return new Map<string, Set<string>>();
    }

    get exerciseEquipmentMap() {
        return new Map<string, Set<string>>();
    }

    get focusCategorySlugs() {
        return new Set(this.generationInput.user_focus_categories.map((f) => f.category))
    }

    get sportCategorySlugs() {
        return new Set(this.generationInput.sport_required_categories.map((s) => s.category))
    }

    get hasLevelData() {
        return this.generationInput.category_levels.length > 0;
    }


    private sessionModes: Array<{ day_of_week: number; mode_slug: SessionModeSlug }> = [];
    private targetDurations: Array<{ day_of_week: number; min: number; max: number }> = [];
    private usedExerciseSlugs: Set<string> = new Set();

    private exerciseData: {
        exerciseEnvironments: any[],
        allEnvironments: any[],
        allEquipments: any[],
        allExercises: any[],
    } = {
            exerciseEnvironments: [],
            allEnvironments: [],
            allEquipments: [],
            allExercises: [],
        };

    constructor(generationInput: PlanGenerationInput, supabase: SupabaseClient) {
        this.generationInput = generationInput;
        this.supabase = supabase;
        this.openAI = new OpenAI()
    }


    public async generatePlan() {

        this.determineSessionModes();
        await this.loadExerciseData();
        await this.generateSessionByMode();


    }



    // main methods ----------------------------------------

    private async setCategoriesForSessions() {



    }

    private async generateSessionByMode() {

        for (const sessionMode of this.sessionModes) {
            const { day_of_week, mode_slug } = sessionMode;
            const { min, max } = this.targetDuration(sessionMode.mode_slug, this.generationInput.min_session_duration, this.generationInput.max_session_duration)
            const exercises = this.filterExercises(mode_slug)
            const isTwoPhaseMode = mode_slug === "full" || mode_slug === "reduced"




        }
    }

    private determineSessionModes() {

        const preferredWorkoutDays = this.generationInput.preferred_workout_days;
        const weeklySchedule = this.generationInput.weekly_schedule;
        const loadProfile = this.generationInput.load_profile;

        const gameDays = new Set(
            (weeklySchedule?.sessions ?? [])
                .filter((s) => s.type === "game" || s.type === "tournament")
                .map((s) => s.day_of_week),
        )

        // Rule 3 baseline: low → full, medium/high → reduced
        const loadBaseline: SessionModeSlug = loadProfile === "low" ? "full" : "reduced"

        const result: Array<{ day_of_week: number; mode_slug: SessionModeSlug }> = []

        for (const day of [...preferredWorkoutDays].sort()) {
            // Skip game/tournament days
            if (gameDays.has(day)) continue

            const constraints: SessionModeSlug[] = [loadBaseline]

            // Rule 1: sport session on this day
            const sportSession = (weeklySchedule?.sessions ?? []).find((s) => s.day_of_week === day)
            if (sportSession) {
                if (sportSession.intensity >= 8) constraints.push("recovery")
                else if (sportSession.intensity >= 4) constraints.push("activation")
                // 1–3: FULL possible, no additional constraint
            }

            // Rule 2: game day proximity (wrap-around not handled — week is linear 1–7)
            for (const gameDay of gameDays) {
                const diff = gameDay - day
                if (diff === 1) constraints.push("activation")    // 1 day before game
                else if (diff === -1) constraints.push("recovery") // 1 day after game
            }

            function lighterMode(a: SessionModeSlug, b: SessionModeSlug): SessionModeSlug {
                return MODE_WEIGHTS[a] <= MODE_WEIGHTS[b] ? a : b
            }

            result.push({ day_of_week: day, mode_slug: constraints.reduce(lighterMode) })
        }

        if (result.length === 0) {
            throw new Error("No sessions to generate — preferred_workout_days resulted in zero sessions after mode determination.")
        }

        this.sessionModes = result;
    }




    private async loadExerciseData() {
        const [
            { data: exerciseEnvRows },
            { data: allEnvRows },
            { data: allEquipmentRows },
            { data: allExercises },
        ] = await Promise.all([
            this.supabase.from("exercise_environments").select("exercise_id, environment_id"),
            this.supabase.from("environments").select("id, slug"),
            this.supabase.from("exercise_equipments").select("exercise_id, equipment_id"),
            this.supabase.from("exercises").select("*, intensity_score, exercise_type, measurement_type, categories(id, slug), exercise_blocks(block_types(slug))"),
        ])

        this.exerciseData = {
            exerciseEnvironments: exerciseEnvRows ?? [],
            allEnvironments: allEnvRows ?? [],
            allEquipments: allEquipmentRows ?? [],
            allExercises: allExercises ?? [],
        }
    }


    // helpers ------------------------------------------------


    private targetDuration(
        mode: SessionModeSlug,
        userMin: number,
        userMax: number,
    ): { min: number; max: number } {
        const r = SESSION_MODE_DURATION[mode]
        if (r.overrides_user) return { min: r.min, max: r.max }
        return { min: Math.max(userMin, r.min), max: Math.min(userMax, r.max) }
    }

    private filterExercises(forMode: SessionModeSlug) {
        const filtered = (this.exerciseData.allExercises ?? []).filter((exercise) => {
            if (this.usedExerciseSlugs.has(exercise.slug)) return false

            // Mode restriction via intensity_score + exercise_type
            const exerciseType = exercise.exercise_type
            const intensityScore = exercise.intensity_score

            switch (forMode) {
                case "full":
                    // dynamic only, all intensities
                    if (exerciseType !== null && exerciseType !== "dynamic") return false
                    break
                case "reduced":
                    // dynamic only, intensity ≤ 7
                    if (exerciseType !== null && exerciseType !== "dynamic") return false
                    if (intensityScore !== null && intensityScore > 7) return false
                    break
                case "activation":
                    // dynamic + restorative, intensity ≤ 5
                    if (exerciseType !== null && exerciseType === "breathing") return false
                    if (intensityScore !== null && intensityScore > 5) return false
                    break
                case "recovery":
                    // all types, intensity ≤ 3
                    if (intensityScore !== null && intensityScore > 3) return false
                    break
            }

            // Equipment
            const requiredEquipment = this.exerciseEquipmentMap.get(exercise.id)
            if (requiredEquipment && requiredEquipment.size > 0 && this.userEquipmentIds.size > 0) {
                let hasMatch = false
                for (const eqId of requiredEquipment) {
                    if (this.userEquipmentIds.has(eqId)) { hasMatch = true; break }
                }
                if (!hasMatch) return false
            }

            // Environment
            const allowedEnvs = this.exerciseEnvMap.get(exercise.id)
            if (allowedEnvs && allowedEnvs.size > 0 && this.envIds.size > 0) {
                let hasMatch = false
                for (const envId of allowedEnvs) {
                    if (this.envIds.has(envId)) {
                        hasMatch = true
                        break
                    }
                }
                if (!hasMatch) return false
            }

            // Level
            if (this.hasLevelData && exercise.category_id) {
                const userLevel = this.categoryLevels.get(exercise.category_id)
                if (userLevel === undefined) return false
                if (userLevel < exercise.min_level || userLevel > exercise.max_level) return false
            }

            return true
        })

        // Cap at 120, prioritise focus + sport categories
        if (filtered.length <= 120) return filtered
        const exercises = [
            ...filtered.filter((e: any) =>
                this.focusCategorySlugs.has(e.categories?.slug) || this.sportCategorySlugs.has(e.categories?.slug)
            ),
            ...filtered
                .filter((e: any) =>
                    !this.focusCategorySlugs.has(e.categories?.slug) && !this.sportCategorySlugs.has(e.categories?.slug)
                )
                .sort(() => Math.random() - 0.5),
        ].slice(0, 120)

        exercises.forEach((e: any) => this.usedExerciseSlugs.add(e.slug))
        return exercises;
    }



    private exercisesToString(exercises: ReturnType<typeof this.filterExercises>) {
        return exercises.map((e) => {
            const blocks = (e.exercise_blocks)
                ?.map((b: any) => b.block_types?.slug)
                .filter(Boolean)
                .join(", ") ?? ""
            const allowedEnvs = this.exerciseEnvMap.get(e.id)
            const envTag = allowedEnvs && allowedEnvs.size > 0
                ? `, environments: [${[...allowedEnvs].map((id) => this.envSlugMap.get(id) ?? id).join(", ")}]`
                : ""
            const intensityTag = e.intensity_score !== null && e.intensity_score !== undefined ? `, intensity: ${e.intensity_score}` : ""
            const typeTag = e.exercise_type ? `, type: ${e.exercise_type}` : ""
            const regionTag = e.body_region ? `, body_region: ${e.body_region}` : ""
            return `[${e.slug}]: ${e.name}, category: ${e.categories?.slug}, blocks: [${blocks}], measurement: ${e.measurement_type ?? "reps_or_duration"}${intensityTag}${typeTag}${regionTag}${envTag}`
        }).join("\n")
    }
}