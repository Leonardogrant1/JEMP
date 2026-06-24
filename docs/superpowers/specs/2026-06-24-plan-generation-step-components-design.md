# Plan Generation Step Components — Design Spec

**Date:** 2026-06-24

## Goal

Extract each wizard step from `app/generate-plan.tsx` into a dedicated component under `components/plan-generation/`. The screen becomes a thin coordinator that renders the right component per phase.

## Files

### New / replace empty

| File | Responsibility |
|---|---|
| `components/plan-generation/SportStep.tsx` | Sport group chips |
| `components/plan-generation/EnvironmentStep.tsx` | Environment list (SelectableRows) |
| `components/plan-generation/EquipmentStep.tsx` | Equipment chip grid |
| `components/plan-generation/EquipmentEnvironmentStep.tsx` | Ambiguous equipment → env assignment |
| `components/plan-generation/GoalsStep.tsx` | Category select + drag-to-rank (both sub-phases, internal branch on `goalsSubPhase`) |
| `components/plan-generation/BodyStep.tsx` | Weight + height sliders |
| `components/plan-generation/ScheduleStep.tsx` | Preferred days, session duration, day-env mapping, schedule notes |
| `components/plan-generation/WeeklyStep.tsx` | Sport sessions with type chips + intensity slider |

### Modified

| File | Change |
|---|---|
| `app/generate-plan.tsx` | Replace each phase JSX block with `<XStep />`, remove per-step styles and imports |

## Component Contract

Every step component:
- Calls `usePlanWizardStore()` directly — zero props
- Owns a `StyleSheet` with only the styles it needs
- Contains the `content` padding style (`paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120`) for its scroll view
- Is a named export (not default) for consistency with the existing `StepBars` pattern

## generate-plan.tsx After Refactor

```tsx
{phase === 'sport' && <SportStep />}
{phase === 'environment' && <EnvironmentStep />}
{phase === 'equipment' && <EquipmentStep />}
{phase === 'equipment-env' && <EquipmentEnvironmentStep />}
{phase === 'goals' && <GoalsStep />}
{phase === 'body' && <BodyStep />}
{phase === 'schedule' && <ScheduleStep />}
{phase === 'weekly' && <WeeklyStep />}
```

Remaining styles in `generate-plan.tsx`: `root`, `header`, `headerCenter`, `bottomBar`, `bottomBtn`, `bottomBtnGradient`.

## Style Migration

Each step component takes ownership of its styles. Shared-looking styles (e.g. `content`, `chipGrid`, `bodyTitle`, `subtitle`, `section`, `sectionLabel`) are duplicated locally — each step is visually distinct enough that a shared stylesheet would add complexity without real benefit.

## Moved Constant

`COMBAT_SPORTS` moves from `generate-plan.tsx` into `WeeklyStep.tsx` where it is used.

## GoalsStep Internal Structure

`GoalsStep.tsx` reads `goalsSubPhase` from the store and renders either:
- `goalsSubPhase === 'select'` → chip grid with `toggleCategory`
- `goalsSubPhase === 'rank'` → `DraggableFlatList` with `setRankedCategories`

Both views live in one file because they represent a single logical wizard step.
