# Design: Equipment-Environment Step in generate-plan.tsx

**Date:** 2026-06-20  
**Status:** Approved

## Summary

Add a new `equipment-env` phase to `generate-plan.tsx` between `equipment` and `goals`. The user can assign ambiguous equipment (compatible with 2+ selected environments) to one or more specific environments. If no ambiguous equipment exists, the phase is auto-skipped — identical behaviour to the onboarding `EquipmentEnvironmentStep`.

## Context

- `generate-plan.tsx` uses a linear phase flow: `sport → environment → equipment → goals → body → schedule → weekly`
- `EquipmentEnvironmentStep` in onboarding already solves this problem for first-time setup
- Step 4b of `generate()` already writes to `user_equipment_environments`, but currently auto-assigns based on `equipmentByEnv × selectedEnvIds` without user input

## Phase Type & PHASES Array

```ts
type Phase = 'sport' | 'environment' | 'equipment' | 'equipment-env' | 'goals' | 'body' | 'schedule' | 'weekly';
const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'equipment-env', 'goals', 'body', 'schedule', 'weekly'];
```

The `StepBars` component derives progress from `PHASES.indexOf(phase)` — no changes needed there.

## New State

```ts
interface AmbiguousItem {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    compatibleEnvIds: string[];
}

const [ambiguousEquipment, setAmbiguousEquipment] = useState<AmbiguousItem[]>([]);
const [equipmentEnvSelections, setEquipmentEnvSelections] = useState<Map<string, Set<string>>>(new Map());
```

## Pre-fill on Load

In the existing `Promise.all([...])` block, add a 7th query:
```ts
supabase.from('user_equipment_environments').select('equipment_id, environment_id').eq('user_id', profile.id)
```

Store the result in a new state variable `savedEquipmentEnvMappings: { equipment_id: string; environment_id: string }[]` to initialise `equipmentEnvSelections` when the `equipment-env` phase is entered.

## Navigation Logic

Replace the inline `goToEquipment()` call from `handleNext` with a new function `handleEquipmentNext()`:

1. Build `allEquipment` (unchanged, already done in `goToEquipment`)
2. From `equipmentByEnv`, find all selected equipment that appear in 2+ selected environments → `ambiguous`
3. If `ambiguous.length === 0`: skip `equipment-env`, go directly to `goals`
4. If `ambiguous.length > 0`:
   - Set `ambiguousEquipment`
   - Initialise `equipmentEnvSelections`: restore from pre-loaded `user_equipment_environments` data, or default to all compatible envs per item
   - Auto-assign unambiguous equipment (exactly 1 compatible env) into `equipmentEnvSelections` as well
   - Set phase to `equipment-env`

### Back navigation

- `equipment-env → equipment` (always, no skip on back)

### `canProceedNext`

- `equipment-env`: always `true` (optional step, same as onboarding)

## UI — `equipment-env` Phase

```
Title: t('onboarding.equipment_location_title')        // reuse existing i18n key
Subtitle: t('onboarding.equipment_location_subtitle')  // reuse existing i18n key

For each item in ambiguousEquipment:
  <JempText> eq.name_i18n[locale] </JempText>
  <View chipGrid>
    for each compatibleEnvId:
      <SelectableChip
        label={env.name_i18n[locale]}
        selected={equipmentEnvSelections.get(eq.id)?.has(envId)}
        onPress={() => toggleEquipmentEnv(eq.id, envId)}
      />
  </View>
```

`toggleEquipmentEnv(equipmentId, envId)`: toggles the env in `equipmentEnvSelections`.

## generate() — Step 4b

Replace the current auto-assign loop with `equipmentEnvSelections`:

```ts
// 4b. Update equipment-environment mapping
await supabase.from('user_equipment_environments').delete().eq('user_id', profile.id);
const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
for (const [equipmentId, envIds] of equipmentEnvSelections) {
    if (selectedEquipmentIds.has(equipmentId)) {
        for (const envId of envIds) {
            equipEnvRows.push({ user_id: profile.id, equipment_id: equipmentId, environment_id: envId });
        }
    }
}
if (equipEnvRows.length > 0) {
    await supabase.from('user_equipment_environments').insert(equipEnvRows);
}
```

> Note: When `equipment-env` is skipped (no ambiguous items), `equipmentEnvSelections` already contains all auto-assigned mappings (built during `handleEquipmentNext`), so `generate()` works correctly in both paths.

## Files Changed

- `app/generate-plan.tsx` — all changes inline, no new files
