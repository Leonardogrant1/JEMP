# Session Structure Redesign — Phase 4: App Session Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v2 sessions first-class in the app: session-type and new-block labels (i18n), generalized block handling in the session screens (hero/chips/main-block logic), conditioning interval prescriptions rendered and runnable in the active session (rounds-as-sets on the existing duration/rest machinery), and session-type identity in the plan views.

**Architecture:** No new screens (the shared-structure payoff): the session screen renders new blocks via the existing generic `t('block_type.${slug}')`; the three hardcoded legacy slug lists become one shared `isContentBlock` helper; conditioning rounds reuse `DurationSet` + `RestOverlay` by expanding `target_rounds` into duration-set rows. Everything testable via jest stays in small helpers.

**Tech Stack:** React Native (Expo), jest, i18n de/en.

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§5.1–§5.3, §5.8)

**Deferral rulings (recorded here):**
- **§5.6 move-with-warnings → after the redesign-branch merge.** The session-manage sheet this feature extends lives on `feat/redesign` (memory `project_redesign_branch`), not on this branch — building a parallel move UI now would be throwaway. The soft-warning logic (placement-rule mirror) is specced and waits for that sheet.
- **§5.7 web admin (metadata selects, AI-prefill fields, PlanSimulator session types) → own follow-up mini-phase** — §6.6's phase 4 is app-only.
- **New session-type imagery assets deferred (content work):** speed/mobility/conditioning sessions get their hero via their own exercises (works once Task 2 generalizes the hero pick) plus a type chip/icon; bespoke artwork can come anytime.

## Global Constraints

- Follow surrounding component idioms exactly; all copy via i18n (keys in Task 1, both locales, real texts).
- Shared helper additions go to `constants/blocks.ts` (new, tiny); no behavior change for legacy sessions (primary/secondary/accessory keep rendering identically — the generalization must be a superset).
- Rounds-as-sets must not change logging semantics for non-conditioning exercises (`target_rounds == null` → exactly today's behavior).
- `npx jest` green; root `npx tsc --noEmit` error count ≤ 85 (current accepted); commit per task with Claude trailer.

## Review Focus

1. **Legacy render parity** — a legacy training session (primary/secondary/accessory) must render pixel-identical logic paths after the slug-list generalization (hero pick order, focus chips, main-block grouping). Pinned by Task 2's helper tests enumerating both legacy and v2 slugs.
2. **Rounds-as-sets isolation** — `target_rounds` expansion must only fire for rows that have it; a normal 3×8 strength exercise must produce exactly 3 set rows as today. Pinned by Task 4's helper test.
3. **Hero pick for sessions without content-block exercises** — a mobility session (single `mobility` block) must produce a hero image, not undefined. Pinned by Task 2 test (mobility slug included in content blocks).
4. **i18n completeness** — every block/session type the worker can emit has `block_type.*`/`session_type.*` keys in BOTH locales; grep-verified in Task 1.
5. **Interval copy correctness** — the conditioning row must show rounds × work/rest from `target_rounds`/`target_duration_seconds`/`target_rest_seconds`, never sets×reps. Pinned by Task 3's formatter test.

---

### Task 1: i18n — session types & new block types

**Files:** `i18n/locales/de.ts`, `i18n/locales/en.ts`

- [ ] **Step 1: Add keys (both locales, full copy)**

```typescript
// de
'session_type.speed': 'Sprint-Einheit',
'session_type.mobility': 'Mobility-Einheit',
'session_type.conditioning': 'Conditioning-Einheit',
'block_type.push': 'Push',
'block_type.pull': 'Pull',
'block_type.lower_body': 'Unterkörper',
'block_type.rotation': 'Rotation',
'block_type.core': 'Core',
'block_type.plyo': 'Sprungkraft',
'block_type.sprint': 'Sprints',
'block_type.cod': 'Richtungswechsel',
'block_type.conditioning': 'Conditioning',
'block_type.mobility': 'Mobility',
'prescription.rounds': '{{rounds}} Runden · {{work}}s Arbeit / {{rest}}s Pause',
// en
'session_type.speed': 'Sprint session',
'session_type.mobility': 'Mobility session',
'session_type.conditioning': 'Conditioning session',
'block_type.push': 'Push',
'block_type.pull': 'Pull',
'block_type.lower_body': 'Lower body',
'block_type.rotation': 'Rotation',
'block_type.core': 'Core',
'block_type.plyo': 'Plyometrics',
'block_type.sprint': 'Sprints',
'block_type.cod': 'Change of direction',
'block_type.conditioning': 'Conditioning',
'block_type.mobility': 'Mobility',
'prescription.rounds': '{{rounds}} rounds · {{work}}s work / {{rest}}s rest',
```

- [ ] **Step 2: Verify** — grep: every slug in the worker's `WORKOUT_BLOCK_SEQUENCE` + `sprint/cod/conditioning/mobility` has a `block_type.` key in both locales; `session_type.` covers `training/recovery/speed/mobility/conditioning` (training/recovery exist already — verify, add if missing).
- [ ] **Step 3: Commit** — `feat(i18n): session type and pattern block labels`

---

### Task 2: Shared block helper + slug-list generalization

**Files:**
- Create: `constants/blocks.ts`, Test: `lib/__tests__/blocks.test.ts` (or `constants/__tests__` matching jest config — check `jest.config` roots first)
- Modify: `app/session/[id].tsx` (hero pick `['primary','secondary','accessory']`, focus chips `['primary','secondary']`, `isMainBlock`), `app/session-summary/[id].tsx:95` (same list)

**Interfaces:**
```typescript
/** Inhalts-Blöcke (alles außer Warmup/Cooldown) — Hero, Chips, Gruppierung. */
export const NON_CONTENT_BLOCKS = new Set(['warmup', 'cooldown'])
export function isContentBlock(slug: string | null | undefined): boolean
/** Reihenfolge für Hero-Pick: Legacy-Hauptblöcke zuerst, dann v2-Blöcke in Sequenz. */
export const HERO_BLOCK_ORDER: string[] // ['primary','secondary','accessory','lower_body','push','pull','sprint','plyo','cod','rotation','core','conditioning','mobility','accessory']
```

- [ ] **Step 1: Failing tests** — `isContentBlock` true for all legacy mains + all v2 content blocks, false for warmup/cooldown/null; `HERO_BLOCK_ORDER` starts with the three legacy slugs (parity pin) and contains every v2 content block incl. `mobility` (Review Focus 3).
- [ ] **Step 2: Implement + rewire** — hero: iterate `HERO_BLOCK_ORDER`; chips + isMainBlock: `isContentBlock(slug)`. Legacy sessions: identical behavior (their blocks only match the legacy part of the order).
- [ ] **Step 3: GREEN + tsc ≤ 85 + Commit** — `feat(app): generalize session block handling for v2 block types`

---

### Task 3: Conditioning prescription display

**Files:**
- Create: `lib/prescription.ts`, Test: `lib/__tests__/prescription.test.ts`
- Modify: the exercise-row prescription render in `app/session/[id].tsx` (locate the `target_sets`/`target_reps` formatting block)

**Interfaces:**
```typescript
export type IntervalPrescription = { rounds: number; workSeconds: number; restSeconds: number }
/** null, wenn keine Intervall-Verschreibung (target_rounds leer) — dann gilt Sätze×Wdh wie bisher. */
export function intervalPrescription(ex: { target_rounds?: number | null; target_duration_seconds?: number | null; target_rest_seconds?: number | null }): IntervalPrescription | null
```

- [ ] **Step 1: Failing tests** — returns the triple when rounds>0 and work>0; null when rounds null/0; falls back rest to 0 when null.
- [ ] **Step 2: Implement + render** — in the session screen row: if `intervalPrescription(ex)` → `t('prescription.rounds', {...})` instead of the sets×reps line (legacy line untouched otherwise).
- [ ] **Step 3: GREEN + Commit** — `feat(app): render conditioning interval prescriptions`

---

### Task 4: Active session — rounds as sets

**Files:**
- Create/extend: `lib/__tests__/prescription.test.ts` (new helper), `lib/prescription.ts`
- Modify: wherever the active session derives the planned set count/rows from `target_sets` (locate via `target_sets` in `components/active-session/SetTable.tsx` / `LogSetSheet.tsx` — scout first, then apply)

**Interfaces:**
```typescript
/** Geplante Satz-Anzahl: Conditioning-Runden laufen als Duration-Sätze über die
 *  bestehende Set-Maschinerie (DurationSet + RestOverlay) — kein neuer Timer. */
export function plannedSetCount(ex: { target_sets?: number | null; target_rounds?: number | null }): number
```
Rule: `target_rounds > 0` → rounds; else `target_sets ?? 1`. The per-set duration comes from `target_duration_seconds` (DurationSet already consumes it); rest between rounds from `target_rest_seconds` (RestOverlay already consumes it).

- [ ] **Step 1: Failing tests** — rounds 10 → 10; rounds null + sets 3 → 3 (Review Focus 2); both null → 1.
- [ ] **Step 2: Scout + wire** — grep `target_sets` in the active-session components, replace count derivation with `plannedSetCount`, verify DurationSet/RestOverlay paths engage for duration-type conditioning exercises (read the components; document findings in the ledger).
- [ ] **Step 3: GREEN + tsc + Commit** — `feat(app): conditioning rounds run as duration sets in the active session`

---

### Task 5: Session-type identity in plan views

**Files:**
- Modify: `app/(tabs)/plan.tsx` (session cards: type label via `t('session_type.' + s.session_type)` when not `training`, plus icon), `components/today-session/TodaysSessionCard.tsx` (same treatment)
- Icon map (inline const): speed → `flash-outline`, mobility → `body-outline`, conditioning → `pulse-outline` (Ionicons).

- [ ] **Step 1: Scout** both files for where the session name/subtitle renders; add the type chip/label only for non-`training`/non-`recovery` types (legacy rendering untouched).
- [ ] **Step 2: tsc ≤ 85 + jest green + Commit** — `feat(app): session type identity in plan and today views`

---

### Task 6: Closing verification

- [ ] `npx jest` green (all suites), root tsc ≤ 85, worker suite untouched (`npm test` 82).
- [ ] Ledger QA checklist for the user (on-device): v2 plan renders — speed session shows "Sprint-Einheit" + sprint/cod blocks labeled; workout shows push/pull/… sections; conditioning session row shows "10 Runden · 30s/30s"; active conditioning exercise counts 10 duration sets with rest overlay; mobility session on a rest day renders with hero; legacy plan (second test user w/o wizard) renders exactly as before.
- [ ] Commit leftovers.
