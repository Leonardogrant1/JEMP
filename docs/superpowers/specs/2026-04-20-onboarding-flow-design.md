# Onboarding Flow Design

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

Minimalistisches 11-Step Onboarding für die JEMP App. Sammelt alle Nutzerdaten die für die Trainingplan-Generierung benötigt werden: Profil, Sportart, Zielkategorien mit Priorität, Selbsteinschätzung, Equipment und Trainingsvorlieben.

---

## Database Changes

### Migration 1: `user_targeted_categories` — priority column
```sql
ALTER TABLE user_targeted_categories
ADD COLUMN priority INTEGER NOT NULL DEFAULT 1;
```

### Migration 2: `user_category_levels` — level_score constraint anpassen
```sql
ALTER TABLE user_category_levels
DROP CONSTRAINT user_category_levels_level_score_check;

ALTER TABLE user_category_levels
ADD CONSTRAINT user_category_levels_level_score_check
CHECK (level_score BETWEEN 1 AND 100);
```

---

## Store Changes (`stores/onboarding-store.ts`)

Den bestehenden Store um drei Felder erweitern:

```ts
targetedCategories: { categoryId: string; priority: number }[]
categoryLevels:     { categoryId: string; score: number }[]
equipmentIds:       string[]
```

Zusätzlich `environmentIds: string[]` als temporäres Feld (wird nicht in die DB geschrieben, nur für Step 8→9 Kopplung gebraucht).

---

## `finishOnboarding` Änderung

Nach dem `user_profiles` UPDATE drei weitere Inserts:

```ts
// 1. user_profiles UPDATE (wie bisher)
await supabase.from('user_profiles').update({ ...profileData, has_onboarded: true }).eq('id', userId);

// 2. targeted categories
await supabase.from('user_targeted_categories').insert(
  targetedCategories.map(({ categoryId, priority }) => ({ user_id: userId, category_id: categoryId, priority }))
);

// 3. category levels
await supabase.from('user_category_levels').insert(
  categoryLevels.map(({ categoryId, score }) => ({ user_id: userId, category_id: categoryId, level_score: score }))
);

// 4. equipments
await supabase.from('user_equipments').insert(
  equipmentIds.map(equipmentId => ({ user_id: userId, equipment_id: equipmentId }))
);
```

---

## Steps

### Step 1 — `NameStep` (neu)
- Vorname + Nachname als zwei TextInputs (stacked, gleicher Stil wie bestehender `name-step`)
- `initialCanContinue: false`
- Enabled wenn beide Felder ≥ 2 Zeichen
- Schreibt `first_name` + `last_name` in den Store

### Step 2 — `BirthdayStep` (neu)
- Drei Inputs: Tag / Monat / Jahr (numerisch, auto-focus-next)
- Oder nativer DatePicker — je nach Plattform
- Validierung: Datum muss in der Vergangenheit liegen, User muss ≥ 13 Jahre alt sein
- Schreibt `birth_date` (ISO string) in den Store

### Step 3 — `GenderStep` (bestehend, anpassen)
- Gleiche UI wie bisher
- Store-Aufruf auf `useOnboardingStore` umstellen (aktuell nutzt er `useUserDataStore`)
- Werte: `male`, `female`, `other` (passend zum DB Enum)

### Step 4 — `BodyStep` (neu)
- Zwei Inputs auf einem Screen: Größe (cm) + Gewicht (kg)
- Numerische Tastatur, Einheiten als Label neben dem Input
- `initialCanContinue: false`, enabled wenn beide Werte valide sind (Größe 50–300cm, Gewicht 20–500kg)
- Schreibt `height_in_cm` + `weight_in_kg` in den Store

### Step 5 — `SportStep` (neu)
- Grid-Layout mit allen `sports_category` Enum-Werten
- Gruppiert nach Kategorie (Kampfsport, Teamsport, Leichtathletik, Kraft, Ausdauer, Racket, Sonstiges)
- Single-select, Tap zum Auswählen
- `initialCanContinue: false`, enabled nach Auswahl
- Schreibt `sports_category` in den Store

### Step 6 — `CategoryFocusStep` (neu)
- Zeigt die 5 Kategorien als wählbare Cards: `strength`, `jumps`, `lower_body_plyometrics`, `upper_body_plyometrics`, `mobility`
- **Phase 1 (Select):** Multi-select, mindestens 1 muss gewählt werden
- **Phase 2 (Rank):** Nach erster Auswahl wechselt der Screen in Rank-Modus: gewählte Kategorien als sortierbare Liste mit Up/Down Buttons oder Drag-Handle
- Priority = Position in der Liste (1 = höchste Priorität)
- `initialCanContinue: false`, enabled sobald ≥ 1 Kategorie gewählt
- Schreibt `targetedCategories: { categoryId, priority }[]` in den Store

### Step 7 — `CategoryLevelStep` (neu)
- Pro gewählter Kategorie (aus Step 6) ein horizontaler Slider 1–100
- Referenzlabels auf der Skala: 1–20 "Anfänger", 21–40 "Einsteiger", 41–60 "Fortgeschritten", 61–80 "Erfahren", 81–100 "Elite"
- Alle Slider auf einem Screen (ScrollView falls nötig)
- Default-Wert: 30 pro Kategorie
- `initialCanContinue: true` (User kann mit Defaults weitergehen)
- Schreibt `categoryLevels: { categoryId, score }[]` in den Store

### Step 8 — `EnvironmentStep` (neu)
- Multi-select: `gym`, `outdoor`, `home` mit Icons/Beschreibungen
- Mindestens 1 muss gewählt werden
- `initialCanContinue: false`
- Schreibt `environmentIds: string[]` in den Store (temporär, nicht in DB)

### Step 9 — `EquipmentStep` (neu)
- Fetcht beim Mount alle Equipments der gewählten Environments via Supabase
  (`environment_equipments` JOIN `equipments` WHERE `environment_id IN (...)`)
- Alle Items initial **preselected**
- User kann einzelne Items abwählen
- `initialCanContinue: true`
- Schreibt finale `equipmentIds: string[]` in den Store

### Step 10 — `WorkoutPrefsStep` (neu)
- **Wochentage:** 7 Toggle-Buttons Mo–So (INTEGER[] 1–7, Montag = 1)
- **Session Duration:** 4 Option-Buttons: 30min / 45min / 60min / 90min
- `initialCanContinue: false`, enabled wenn ≥ 1 Tag + eine Duration gewählt
- Schreibt `preferred_workout_days` + `preferred_session_duration` in den Store

### Step 11 — `CompleteStep` (bestehend, minimal anpassen)
- Bestehender Step bleibt, Text ggf. anpassen
- `preContinue` triggert `finishOnboarding` (batch inserts)

---

## File Structure

```
components/onboarding/steps/
  name-step.tsx           (bestehend, anpassen: first_name + last_name)
  birthday-step.tsx       (neu)
  gender-step.tsx         (bestehend, store umstellen)
  body-step.tsx           (neu)
  sport-step.tsx          (neu)
  category-focus-step.tsx (neu)
  category-level-step.tsx (neu)
  environment-step.tsx    (neu)
  equipment-step.tsx      (neu)
  workout-prefs-step.tsx  (neu)
  complete-step.tsx       (bestehend, minimal)

stores/
  onboarding-store.ts     (erweitern)

app/
  onboarding.tsx          (steps array befüllen)

supabase/migrations/
  YYYYMMDD_add_priority_to_user_targeted_categories.sql  (neu)
  YYYYMMDD_update_level_score_constraint.sql             (neu)
```

---

## Design-Prinzipien

- Alle neuen Steps folgen dem bestehenden Dark-Theme: schwarzer Hintergrund, weißer Text
- `initialCanContinue: false` als Default — User muss aktiv wählen
- Keine zusätzliche Fehleranzeige außer disabled Continue-Button
- `theme: 'dark'` für alle Steps
