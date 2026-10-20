// Pure Übungs-Taxonomie — auch von jemp-api (Swap-Endpoint) gebundelt: hier NIE openai/zod/temporal importieren.

export type ExerciseFilterMaps = {
  envByExercise: Map<string, Set<string>>
  equipByExercise: Map<string, Set<string>>
  userEnvs: Set<string>
  userEquip: Set<string>
  /** equipment_id → environment_ids: nur ortsgebundenes Equipment hat Einträge. */
  equipmentEnvs: Map<string, Set<string>>
  levelByCategoryId: Map<string, number>
  hasLevelData: boolean
}

// categories bleibt untypisiert: Supabase inferiert die Join-Spalte als Array,
// zur Laufzeit ist es das Einzel-Objekt der Relation (wie im Legacy-Filter).
type FilterableRow = { id: string; min_level: number; max_level: number; categories?: unknown }

/** Übungs-Filter, optional auf eine Tages-Umgebung verengt (dayEnvId).
 *  Mit null entspricht er dem bisherigen Any-Match über alle User-Umgebungen;
 *  mit Tages-Umgebung zählen nur dort erlaubte Übungen und dort verfügbares
 *  Equipment (equipment_environments). */
export function makeExerciseFilter(maps: ExerciseFilterMaps, dayEnvId: string | null) {
  const equipUsable = (id: string): boolean => {
    if (!maps.userEquip.has(id)) return false
    if (dayEnvId === null) return true
    const envs = maps.equipmentEnvs.get(id)
    return !envs || envs.size === 0 || envs.has(dayEnvId)
  }
  return (row: FilterableRow): boolean => {
    const required = maps.equipByExercise.get(row.id)
    // Leeres User-Equipment heißt "nichts", nicht "unbekannt" (QA 15.10.):
    // der frühere size>0-Skip ließ Langhantel-Übungen zu Bodyweight-Usern durch.
    if (required && required.size > 0 && ![...required].some(equipUsable)) return false
    const allowed = maps.envByExercise.get(row.id)
    if (allowed && allowed.size > 0) {
      if (dayEnvId !== null) {
        if (!allowed.has(dayEnvId)) return false
      } else if (maps.userEnvs.size > 0 && ![...allowed].some((id) => maps.userEnvs.has(id))) {
        return false
      }
    }
    const categoryId = (row.categories as { id?: string } | null)?.id
    if (maps.hasLevelData && categoryId) {
      const level = maps.levelByCategoryId.get(categoryId)
      if (level === undefined) return false
      if (level < row.min_level || level > row.max_level) return false
    }
    return true
  }
}

/** Sport-Gate (QA 10.10., v2-Portierung des Legacy-Verhaltens): is_sport_specific-
 *  Übungen sind nur für ihre zugeordneten Sportgruppen sichtbar; ohne Zuordnung
 *  für niemanden. Nicht-spezifische Übungen passieren immer. */
export function makeSportGate(
  sportGroupsByExercise: Map<string, Set<string>>,
  groupName: string | undefined,
) {
  return (row: { id: string; is_sport_specific?: boolean | null }): boolean => {
    if (!row.is_sport_specific) return true
    const groups = sportGroupsByExercise.get(row.id)
    return !!groupName && !!groups && groups.has(groupName)
  }
}
