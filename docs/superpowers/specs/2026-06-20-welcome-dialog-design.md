# Welcome Dialog & Plan Empty State — Design Spec

**Date:** 2026-06-20

## Overview

When a user completes the tutorial and lands in the main app for the first time without an existing plan, they see a welcome dialog. After dismissing it to the plan tab, they find a proper empty state with a one-tap "Plan generieren" button that triggers plan generation immediately — no form needed, since all data was collected during onboarding.

---

## 1. Welcome Dialog

### Location
Added as a second `<Modal>` in `app/(tabs)/_layout.tsx`, alongside the existing confetti modal.

### Trigger Conditions (checked on mount of tab layout)
All three must be true:
1. `hasSeenTutorial === true` — from the existing tutorial Zustand store
2. No active plan exists — checked via a Supabase query (`select id from plans where user_id = $uid limit 1`)
3. `has_shown_welcome` not set in AsyncStorage — ensures the dialog only ever shows once

On first trigger: set `has_shown_welcome = 'true'` in AsyncStorage immediately (before showing) to prevent double-display on re-renders or fast re-mounts.

### Content
- **Title:** `"Welcome to JEMP, {first_name}!"`
- **Body:** `"Deine Einstellungen wurden gespeichert. Du bist bereit, deinen ersten Plan zu generieren."`
- **CTA Button:** `"Plan generieren"` — navigates to the plan tab (`/(tabs)/plan`) and closes the dialog

### First Name Source
Read from the authenticated Supabase user profile (`profiles.first_name`), which is already loaded in the app at this point.

### Dismissal
Only via the CTA button. No backdrop tap / swipe-to-dismiss — the user must actively choose to proceed.

---

## 2. Plan Tab Empty State

### Location
`app/(tabs)/plan.tsx` — replaces the current minimal empty state (lines 218–224).

### Shown When
`plan === null && !isGenerating && !isError`

### Content
- Icon: Rocket (or similar forward-looking icon already in assets)
- Title: `"Noch kein Plan vorhanden"`
- Subtitle: `"Starte jetzt und JEMP generiert deinen personalisierten Trainingsplan."`
- Button: `"Plan generieren"`

### Button Behavior
1. Calls `POST /api/plan-generation/start` directly (same endpoint used by `generate-plan.tsx`, no form steps needed since onboarding already persisted all user preferences)
2. The existing plan generation store subscription in `plan.tsx` picks up `isGenerating = true` → `PlanGenerationScreen` renders automatically
3. Error state handled by the existing `isError` branch already in `plan.tsx`

---

## 3. Data Flow

```
Tutorial completes
  → router.replace('/(tabs)')
  → _layout.tsx mounts
  → checks: hasSeenTutorial + no plan + AsyncStorage key absent
  → sets AsyncStorage key, shows Welcome Dialog
  → user taps "Plan generieren"
  → dialog closes, router navigates to /(tabs)/plan
  → plan.tsx renders empty state (no plan yet)
  → user taps "Plan generieren"
  → POST /api/plan-generation/start
  → planGenerationStore.isGenerating = true
  → PlanGenerationScreen shown
  → generation completes → plan loads normally
```

---

## 4. Out of Scope
- The dialog does not re-appear if the user already has a plan (even on fresh install / logout-login)
- No changes to onboarding, tutorial, or generate-plan.tsx flows
- No i18n changes for English (dialog copy is German-only for now, matching existing app direction)
