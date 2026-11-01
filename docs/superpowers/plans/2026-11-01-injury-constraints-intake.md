# Verletzungs-Constraints Plan B: Zuführung (Extraktion + App-Flows)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Freitext „Verletzungen & Einschränkungen" wird per LLM in bestätigte `user_injury_constraints` übersetzt (Onboarding-Confirm + blockierendes Rest-Gate vor jeder Generierung), ist im Profil verwaltbar, wirkt sofort auf laufende Pläne (Strip) und ist im Plan sichtbar (Badge + Prio-Konflikt-Messaging).

**Architecture:** Neuer synchroner jemp-api-Endpoint `POST /api/injury-extraction` (gpt-5-mini, Structured Output, Tag-Enum live aus `contraindication_tags`) liefert Vorschläge; die App schreibt bestätigte Constraints DIREKT via Supabase (RLS existiert). Ein geteilter Gate-Store + transparentModal-Sheet blockiert alle vier Generierungs-Trigger VOR Superwall. Der Worker persistiert neu `workout_plans.injury_adjusted` + `injury_conflicts` (Migration), die App rendert Badge/Konflikt-Hinweis. Strip-on-Change läuft client-seitig nach dem Muster der bestehenden Session-Mutationen.

**Tech Stack:** Expo/React Native (Zustand, i18next, Reanimated-Sheets), jemp-api (Express, OpenAI SDK), Temporal-Worker (vitest), Supabase (RLS, Migration), PostHog via `trackerManager`.

**Spec:** `docs/superpowers/specs/2026-11-01-injury-constraints-design.md` (§4–§6 sind der Gegenstand dieses Plans; §1–§3 sind gebaut und gemerged).

## Global Constraints

- Onboarding wird NIE durch Extraktion blockiert; Fehler/Timeout → `injury_extraction_status='failed'`, Nachholung am Rest-Gate (Spec §4).
- Gate ohne Sackgasse: Extraktion am Gate mit 15s-Timeout; bei Fehler Fallback auf manuelle Tag-Auswahl inkl. Option „Keine Einschränkungen". Der User kommt immer zum Plan (Spec §5).
- Gate VOR der Paywall: Gate-Check läuft vor `openWithPlacement('generate_plan', …)` bzw. vor dem `startPlanGeneration()` des Wizard-Pfads (Spec §5).
- Nur bestätigte Constraints wirken (`confirmed_at IS NOT NULL AND revoked_at IS NULL`); `mode ∈ {block, light_only}`; `origin ∈ {onboarding, recheck, manual}`.
- Re-Check NUR wenn `injury_confirmed_at` älter als 7 Tage (Spec §5).
- Unbekannte Tag-Slugs aus dem LLM werden serverseitig verworfen; nicht mappbare Verletzungsinhalte landen als `unmapped` und werden NIE still verworfen (Spec §4).
- Scheduling-Inhalte werden NICHT als Constraints verarbeitet, sondern mit Hinweis auf den Wochenplan gespiegelt (Spec §4).
- i18n: JEDER neue Key in `i18n/locales/en.ts` UND `de.ts` (TS erzwingt Vollständigkeit via `Record<TranslationKeys, string>`); neue Keys im `injuries.*`-Namespace einfügen, NICHT im `ui.*`-Block nahe `ui.timer_done` (dort liegen fremde uncommittete Änderungen).
- VORBEDINGUNG Ausführung: Die uncommitteten Intervall-Checkoff-Änderungen (components/active-session/*, i18n/locales/*, lib/prescription*, stores/active-session-ui-store.ts) sind VOR Task 3 auf einen eigenen Branch zu committen oder zu stashen — sonst Vermischungsgefahr. Bis dahin gilt: nie `git add -A`, nur explizite Pfade.
- Keine Pushes auf Prod; Deploys macht der User. Deploy-Reihenfolge: Migration (`db:push:prod`) → Worker UND jemp-api GEMEINSAM (Source-Kopplung) → App-Release. jemp-api braucht neu `OPENAI_API_KEY` als Secret (User-Schritt, im Abschluss-Report nennen).
- Kein Laufzeit-LLM im Generator; das LLM ist hier einmaliger Übersetzer (Extraktion).

## Review Focus

1. Extraktions-Timeout am Gate → manueller Fallback mit „Keine Einschränkungen" muss den User IMMER zum Plan lassen → Test in Task 5 (Gate-Logik) + Task 1 (Server-Timeout).
2. Notes enthalten NUR Scheduling/Noise → Confirm zeigt Umlenk-Hinweis, User bestätigt mit 0 Constraints → `injury_extraction_status='confirmed'` (Prompt-Ersetzung greift, Plan A) → Test in Task 2 (confirmInjuryConstraints mit leerer Liste) + Task 4.
3. Paywall-Abbruch NACH bestandenem Gate → Confirm-Daten bleiben persistiert, erneuter Tap re-gated nicht innerhalb 7 Tagen → Test in Task 5 (`needsInjuryGate` nach frischem `injury_confirmed_at` → `null`).
4. Strip-on-Change darf NIE geloggte/abgeschlossene Sessions oder Exercises mit performed sets anfassen → Test in Task 6.
5. LLM liefert unbekannten Slug / kaputtes JSON → Server verwirft bzw. 502, nie ungefilterte Weitergabe → Test in Task 1.

---

### Task 1: jemp-api Extraktions-Endpoint

**Files:**
- Create: `externals/jemp-api/src/injury-extraction/index.ts` (Handler)
- Create: `externals/jemp-api/src/injury-extraction/extract.ts` (pure Logik + Schema)
- Create: `externals/jemp-api/src/injury-extraction/extract.test.ts`
- Modify: `externals/jemp-api/src/index.ts` (Route registrieren, nach L117)

**Interfaces:**
- Consumes: Auth-Muster aus `src/index.ts:44-56` (Service-Role-Client + `auth.getUser(token)`); `must()`-Muster aus `src/swap-route/index.ts:24-27` (kopieren, fail-closed).
- Produces: `POST /api/injury-extraction`, Body `{ note: string }`, Response 200 `ExtractionResult`:

```ts
export type ExtractionProposal = { tag_slug: string; mode: 'block' | 'light_only'; acute: boolean; reason: string }
export type ExtractionResult = {
  constraints: ExtractionProposal[]
  unmapped: string[]        // erkannte Verletzungsinhalte ohne passenden Tag
  scheduling: string[]      // erkannte Scheduling-Inhalte (werden gespiegelt, nicht verarbeitet)
  noise: string[]
}
export async function extractInjuryConstraints(note: string, validSlugs: string[], openai: OpenAI): Promise<ExtractionResult>
```

- [ ] **Step 1: Failing Tests schreiben** — `extract.test.ts` mit gemocktem OpenAI-Client (Response injizierbar):

```ts
test('maps forearm strain note to grip/wrist tags', …)            // Mock liefert beide Tags → Result enthält beide, mode block, acute true
test('drops unknown tag_slug from model output', …)                // Mock liefert ['grip_pulling_loaded','fantasy_tag'] → nur grip bleibt
test('classifies scheduling-only note', …)                         // „Dienstag Basketball" → constraints [], scheduling ['…']
test('throws on malformed model JSON', …)                          // Mock liefert kaputtes JSON → wirft (Handler → 502)
test('empty note returns empty result without API call', …)        // note '' → alle Listen leer, OpenAI-Mock nie aufgerufen
```

- [ ] **Step 2: Test-Fail verifizieren** — Run: `cd externals/jemp-api && npm test` — Expected: neue Tests FAIL (Modul fehlt)
- [ ] **Step 3: `extract.ts` implementieren** — gpt-5-mini, `response_format: json_schema, strict: true`; Schema: `constraints[]` mit `tag_slug: enum(validSlugs)`, `mode: enum`, `acute: bool`, `reason: string` + `unmapped/scheduling/noise: string[]`. Nachvalidierung: Slugs ∉ validSlugs verwerfen (Enum schützt, Truncation-Pfad nicht). Prompt (deutsch, im Code): Übersetze Verletzungs-Freitext in Kontraindikations-Tags; Beispiele aus Spec §1-Tabelle als Few-Shots; konservativ: akute Reha → `acute:true` + `mode:'block'`.
- [ ] **Step 4: Handler implementieren** — Auth wie plan-generation/start; `contraindication_tags.select('slug')` via `must()`; `extractInjuryConstraints` mit 12s-Server-Timeout (`AbortSignal.timeout`); Fehler → 502 `{ error }` (Client fällt auf manuell zurück, Task 5). Route: `app.post('/api/injury-extraction', injuryExtractionHandler)`.
- [ ] **Step 5: Tests grün + Build** — Run: `npm test && npm run build` — Expected: alle grün, esbuild ok
- [ ] **Step 6: Commit** — `feat(api): injury-extraction endpoint (gpt-5-mini structured output)`

### Task 2: App-Service-Schicht (lib + Typen)

**Files:**
- Create: `lib/injury-constraints.ts`
- Create: `lib/__tests__/injury-constraints.test.ts` (gleicher Runner wie `lib/__tests__/prescription.test.ts` — Implementer prüft dessen Aufruf und nutzt denselben; existiert keiner, Verifikation via `npx tsc --noEmit` + Report-Hinweis)
- Modify: `types/database.ts` (Typen für `user_injury_constraints`, `contraindication_tags` ergänzen, falls nicht aus database.types.ts bezogen)

**Interfaces:**
- Consumes: Task-1-Typen (`ExtractionResult`, `ExtractionProposal` — in lib dupliziert als App-Typen, jemp-api ist nicht importierbar); Supabase-Client `lib/supabase`; Fetch-Muster aus `lib/fetch-swap-alternatives.ts:15-31`.
- Produces (von Tasks 3–7 konsumiert):

```ts
export type InjuryConstraint = { id: string; tag_slug: string; mode: 'block' | 'light_only'; acute: boolean; source_note: string | null; confirmed_at: string }
export type ConfirmedChoice = { tag_slug: string; mode: 'block' | 'light_only' | 'ok'; acute: boolean }   // 'ok' = User lehnt ab → keine Row
export async function fetchContraindicationTags(): Promise<{ id: string; slug: string }[]>
export async function fetchActiveConstraints(): Promise<InjuryConstraint[]>                      // revoked_at IS NULL, joined slug
export async function requestExtraction(note: string): Promise<ExtractionResult>                 // POST /api/injury-extraction, 15s-Timeout, wirft bei !ok
export async function confirmInjuryConstraints(choices: ConfirmedChoice[], sourceNote: string | null, origin: 'onboarding' | 'recheck' | 'manual'): Promise<void>
  // 1) bestehende aktive Rows des Users mit revoked_at=now() schließen, 2) pro choice.mode!=='ok' Row inserten (confirmed_at=now),
  // 3) user_profiles: injury_extraction_status='confirmed', injury_confirmed_at=now()
export async function markExtractionFailed(): Promise<void>                                      // injury_extraction_status='failed'
export function needsInjuryGate(p: { schedule_notes: string | null; injury_extraction_status: string; injury_confirmed_at: string | null }, hasActiveConstraints: boolean, now?: Date): 'extract' | 'retry' | 'recheck' | null
```

- [ ] **Step 1: Failing Tests für `needsInjuryGate`** — pure Funktion, exakte Fälle:

```ts
test('notes + pending → extract')                      // Spec §5 Fall a (Bestandsuser)
test('failed → retry')                                 // Fall b
test('active constraints + confirmed_at 8 Tage alt → recheck')   // Fall c, Grenze: >7 Tage
test('active constraints + confirmed_at 6 Tage alt → null')
test('keine notes + pending + keine constraints → null')
test('confirmed + keine constraints + frisch → null')  // Review Focus 3
```

- [ ] **Step 2: Fail verifizieren**, **Step 3: implementieren** (Gate-Priorität: extract > retry > recheck), **Step 4: Tests grün + `npx tsc --noEmit` Baseline-Parität**
- [ ] **Step 5: Commit** — `feat(app): injury-constraints service layer + gate decision`

### Task 3: Onboarding — Feld-Umtext + Confirm-Step + Akut-Screen

**Files:**
- Modify: `components/onboarding/steps/injuries-step.tsx` (Texte via neue Keys)
- Create: `components/onboarding/steps/injuries-confirm-step.tsx` (`InjuriesConfirmStep`)
- Modify: `app/onboarding.tsx:133` (Confirm-Step nach InjuriesStep einfügen, `shouldSkip: () => !store.schedule_notes?.trim()`)
- Modify: `components/plan-generation/ScheduleDetailStep.tsx` (gleiche neue Keys)
- Modify: `i18n/locales/en.ts` + `de.ts` (neuer `injuries.*`-Block; bestehende `plan.schedule_notes_*`-Keys umtexten auf „Verletzungen & körperliche Einschränkungen")

**Interfaces:**
- Consumes: `requestExtraction`, `confirmInjuryConstraints`, `markExtractionFailed`, `fetchContraindicationTags` (Task 2); `useOnboardingControl` + Step-Muster aus `injuries-step.tsx`; `trackerManager.track` (`lib/tracking/tracker-manager.ts:65`).
- Produces: Confirm-UI-Komponente `ConstraintChoiceList` (in der Step-Datei), die Task 5 im Gate-Sheet wiederverwendet: `({ proposals, unmapped, scheduling, allTags, onChange }: { proposals: ExtractionProposal[]; … onChange: (choices: ConfirmedChoice[]) => void })`.

- [ ] **Step 1: i18n-Keys anlegen (en+de)** — `injuries.confirm_title`, `injuries.confirm_subtitle`, `injuries.choice_block` („Vermeiden"), `injuries.choice_light` („Nur leicht"), `injuries.choice_ok` („Ist ok"), `injuries.unmapped_title` („Erkannt, aber nicht gezielt filterbar"), `injuries.unmapped_assign` („Tag manuell zuordnen"), `injuries.scheduling_redirect` („Das klingt nach Wochenplan — trag es dort ein, dann fließt es in die Belastungssteuerung."), `injuries.acute_title`, `injuries.acute_body` („Kläre die Belastung mit Arzt oder Physio."), `injuries.extraction_loading`, `injuries.extraction_failed_hint`, `injuries.none_option` („Keine Einschränkungen"). Feld-Umtext: `plan.schedule_notes_label` → „Verletzungen & körperliche Einschränkungen" (+ Subtitle/Placeholder/Beispiele auf Verletzungs-Beispiele umstellen; EN analog).
- [ ] **Step 2: `InjuriesConfirmStep` implementieren** — bei Mount `requestExtraction(store.schedule_notes)`; Loading-State; Ergebnis: pro Constraint ein Element „Verstanden: {reason}. {Tag-Klartext}: [Vermeiden / Nur leicht / Ist ok]" (Vorauswahl = vorgeschlagener mode; bei `acute` Vorauswahl „Vermeiden" + Akut-Hinweisblock mit `injuries.acute_body`); `unmapped`-Liste mit manueller Tag-Zuordnung (Auswahl aus `fetchContraindicationTags`); `scheduling`-Spiegel mit `injuries.scheduling_redirect`. Continue → `confirmInjuryConstraints(choices, note, 'onboarding')` in `preContinue`. Extraktion fehlgeschlagen → `markExtractionFailed()`, Hinweis anzeigen, Continue bleibt möglich (Onboarding nie blockiert). Events: `injury_extraction_started/completed/failed` (`{constraint_count, unmapped_count}`), `injury_confirm_completed` (`{blocked, light_only, dismissed}`).
- [ ] **Step 3: Step registrieren** — nach `InjuriesStep` in `app/onboarding.tsx`; `shouldSkip` wenn Notes leer; `theme: 'dark'`, `initialCanContinue: false` bis Extraktion fertig oder fehlgeschlagen.
- [ ] **Step 4: Verifikation** — `npx tsc --noEmit` Baseline-Parität; manueller Smoke per Expo optional (im Report als offen markieren, On-Device-QA macht der User).
- [ ] **Step 5: Commit** — `feat(onboarding): injury confirm step + field retext`

### Task 4: Wizard-Parität prüfen + Prompt-Status-Konsistenz

**Files:**
- Modify: `stores/plan-wizard-store.ts:476-493` (`generate()`)

**Interfaces:**
- Consumes: Task 2 (`markExtractionFailed`-Analogon): Logik inline.
- Produces: Wizard setzt bei GEÄNDERTEN Notes `injury_extraction_status='pending'` zurück (damit das Gate beim nächsten Generieren die Extraktion nachholt und der Generator-Prompt nicht veraltete Constraints als `confirmed` behandelt).

- [ ] **Step 1: Implementieren** — in `generate()`: wenn `scheduleNotes.trim() || null` ≠ vorherigem `profile.schedule_notes` → ins `user_profiles`-Update zusätzlich `injury_extraction_status: 'pending'` aufnehmen. (Der unmittelbar folgende `startPlanGeneration()` läuft dann durchs Gate von Task 5 → Extraktion+Confirm VOR dem POST.)
- [ ] **Step 2: Verifikation** — `npx tsc --noEmit`; Logik-Review im Diff (kein Test-Harness für Stores).
- [ ] **Step 3: Commit** — `feat(app): reset extraction status when notes change in wizard`

### Task 5: Rest-Gate (Store + Sheet + Verdrahtung an allen vier Triggern)

**Files:**
- Create: `stores/injury-gate-store.ts`
- Create: `app/injury-gate.tsx` (transparentModal-Route, Sheet-Muster aus `app/edit-profile.tsx`/`app/new-plan.tsx`)
- Modify: `app/_layout.tsx:165-183` (Route registrieren)
- Modify: `app/(tabs)/plan.tsx:199,214`, `app/new-plan.tsx:85-103`, `components/plan/PlanGenerationScreen.tsx:176`, `stores/plan-wizard-store.ts:497` (Gate vor Trigger)
- Modify: `i18n/locales/en.ts` + `de.ts` (`injuries.gate_*`, `injuries.recheck_*` Keys)

**Interfaces:**
- Consumes: `needsInjuryGate`, `requestExtraction`, `confirmInjuryConstraints`, `fetchActiveConstraints`, `fetchContraindicationTags` (Task 2); `ConstraintChoiceList` (Task 3); Profil-Daten via bestehendem Profile-Fetch.
- Produces:

```ts
// stores/injury-gate-store.ts
export async function ensureInjuryGate(router: Router): Promise<boolean>
  // true = kein Gate nötig, Aufrufer fährt sofort fort.
  // false = Gate nötig: speichert onPassed-Callback im Store, router.push('/injury-gate'), Aufrufer bricht ab.
  // Das Sheet ruft nach erfolgreichem Abschluss onPassed() auf (führt den ursprünglichen Trigger aus) und schließt sich.
```

- [ ] **Step 1: Failing Tests (Gate-Verdrahtungs-Logik ist in Task 2 getestet; hier UI-frei nur Store)** — `ensureInjuryGate` mit gemocktem `needsInjuryGate`: `null` → true ohne push; `'extract'` → false + push + Callback gespeichert.
- [ ] **Step 2: Sheet implementieren** — drei Modi nach Gate-Fall: `extract`/`retry`: Extraktion mit 15s-Timeout → `ConstraintChoiceList`; Timeout/Fehler → manueller Fallback (Tag-Liste + prominente Option `injuries.none_option`, die mit 0 Constraints bestätigt); `recheck`: aktive Constraints vorbelegt als „Gilt noch: {Tag}?" [Ja / Ausgeheilt / Anpassen] — „Ja" alle = Ein-Tap-Pfad (`confirmInjuryConstraints` mit unveränderten choices, origin `'recheck'`); „Ausgeheilt" → choice `'ok'`. Abschluss: `onPassed()` + dismiss. Events: `injury_gate_shown {case}`, `injury_gate_passed {case, constraint_count}`.
- [ ] **Step 3: Verdrahten** — an den vier Stellen: `if (!(await ensureInjuryGate(router))) return;` VOR `openWithPlacement(…)` (plan.tsx CTA L214, plan.tsx Wizard-Entry L199, new-plan.tsx L93 + L103) bzw. vor `startPlanGeneration()` (PlanGenerationScreen Retry L176, plan-wizard-store generate() L497 — dort zusätzlich, als Absicherung des Wizard-Pfads; Doppel-Gate ist idempotent, zweiter Check ist nach frischem confirm `null`).
- [ ] **Step 4: Verifikation** — Tests grün, `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(app): blocking injury gate before all plan-generation triggers`

### Task 6: Strip-on-Change + Profil-Sektion „Einschränkungen"

**Files:**
- Create: `mutations/use-strip-injury-violations.ts`
- Create: `app/injury-settings.tsx` (transparentModal-Sheet, Muster `app/edit-profile.tsx`)
- Modify: `app/_layout.tsx` (Route), `app/(tabs)/profile.tsx` (SettingsRow in „Profile"-Sektion, nach L294)
- Modify: `i18n/locales/en.ts` + `de.ts` (`injuries.profile_*`, `injuries.strip_*` Keys)

**Interfaces:**
- Consumes: Task 2 (fetch/confirm/revoke); Bulk-Mutations-Muster aus `mutations/use-adjust-rest-times.ts` (scope 'all': `.eq('status','scheduled')`) und Lock-Check aus `mutations/use-swap-exercise.ts:17-22` (performed-sets-Guard).
- Produces:

```ts
export async function stripInjuryViolations(blockedTagIds: string[]): Promise<{ removedExercises: number; removedBlocks: number }>
  // 1) blockierte exercise_ids via exercise_contraindications ∩ blockedTagIds
  // 2) betroffene workout_session_block_exercises der ZUKÜNFTIGEN sessions des aktiven Plans (status='scheduled'),
  //    OHNE solche mit performed sets → löschen
  // 3) geleerte workout_session_blocks (0 verbleibende exercises) löschen
```

- [ ] **Step 1: RLS prüfen** — Run: delete-Versuch als authenticated User auf eigene `workout_session_block_exercises`/`workout_session_blocks` gegen lokale DB (Wegwerf-Script im Scratchpad). Expected: erlaubt. Falls nicht: Mini-Migration mit delete-Policies (eigene Rows via join auf workout_sessions.user_id) ergänzen — dann zuerst Migration committen.
- [ ] **Step 2: Failing Test für die Selektions-Query-Logik** — pure Helper `selectStrippable(sessions, blockedIds, performedSetCounts)` in `lib/injury-constraints.ts` + Tests: geloggte Exercise bleibt (Review Focus 4); completed Session bleibt; geleerter Block wird gemeldet.
- [ ] **Step 3: Mutation implementieren** (nutzt den Helper; DB-Zugriffe wie Muster), Event `injury_strip_applied {removedExercises, removedBlocks}`.
- [ ] **Step 4: Profil-Sheet implementieren** — Liste aktiver Constraints (Tag-Klartext + Modus-Chip), Modus ändern / „Ausgeheilt" (revoke) / manuell hinzufügen (Tag-Picker aus `fetchContraindicationTags`, origin `'manual'`). Nach Hinzufügen/Verschärfen eines `block`: `stripInjuryViolations` auf aktiven Plan + Dialog „Übungen entfernt — Plan neu generieren?" → bei Ja Route in den bestehenden Generieren-Flow (`openWithPlacement`-Pfad der Plan-Tab-CTA). Nach Lockern/Revoke: nur Hinweis „wirkt ab der nächsten Generierung".
- [ ] **Step 5: Verifikation** — Tests grün, tsc, Smoke gegen lokale DB (Strip auf leo2-Plan, Zählung im Report).
- [ ] **Step 6: Commit** — `feat(app): injury settings section + strip future sessions on constraint change`

### Task 7: Worker-Sichtbarkeitsdaten (Migration + prepare-v2 + savePlan)

**Files:**
- Create: `supabase/migrations/20261102090000_injury_visibility.sql`
- Modify: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts`, `src/plan-generation/v2/injury-constraints.ts`, `src/activities/save-plan.ts`, Workflow-Threading (`generate-plan-workflow.ts`), `database.types.ts` (regeneriert)
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/injury-visibility.test.ts`

**Interfaces:**
- Consumes: bestehende `injuryExclusions`/`allowedRows`/`exerciseRows` in prepare-v2; `pillar_levels`.
- Produces: Spalten `workout_plans.injury_adjusted BOOLEAN NOT NULL DEFAULT false`, `workout_plans.injury_conflicts JSONB` (Array `{ pillar: string; reason: 'pool_emptied' | 'pool_reduced' }`); `PrepareResult` + `savePlan`-Input um beide Felder erweitert; pure Funktion:

```ts
export function detectPriorityConflicts(before: V2ExerciseRow[], after: V2ExerciseRow[], pillarLevels: PillarLevels): { pillar: string; reason: 'pool_emptied' | 'pool_reduced' }[]
// Nur Säulen mit Level 3. Pool-Prädikate: sprints → sprint_type != null; lower/upper_body_plyometrics → plyo_type lower/upper; strength → strength_pattern != null.
// 'pool_emptied': after-Pool 0; 'pool_reduced': after < 3 ODER after ≤ 50 % von before.
```

- [ ] **Step 1: Migration** (beide Spalten) + `npx supabase migration up` + Types regenerieren + tsc-Baseline.
- [ ] **Step 2: Failing Tests** — `detectPriorityConflicts`: Referenzfall sprints=3 + alle Sprints blockiert → `pool_emptied` (Spec §5 Sichtbarkeit); sprints=2 + leer → KEIN Konflikt (nur Prio-Säulen); strength=3 + 40 % entfernt → kein Konflikt (über 50 %-Schwelle); `injuryAdjusted`: Exclusions schneiden Universum → true, leere Exclusions → false (Referenz-No-Op bleibt).
- [ ] **Step 3: Implementieren + threading** — prepare-v2 berechnet beides einmal (vor/nach `filterRowsByInjury`); durch `PrepareResult` → Workflow → `savePlan` (Insert-Felder). `injury_adjusted = blockedIds∪lightOnlyIds schneidet exerciseRows`.
- [ ] **Step 4: Voller Worker-Lauf** — `npx vitest run` + `npx tsc --noEmit -p tsconfig.json` — Expected: alles grün.
- [ ] **Step 5: Commit** — `feat(worker): persist injury_adjusted + priority conflicts on plans`

### Task 8: Plan-Sichtbarkeit in der App (Badge + Konflikt-Messaging)

**Files:**
- Create: `components/plan/InjuryAdjustedBadge.tsx`
- Modify: `app/(tabs)/plan.tsx` (Badge über der Session-Liste, wenn `plan.injury_adjusted`), `providers/plan-provider.tsx` (Felder durchreichen, falls select eingeschränkt)
- Create: `app/injury-plan-info.tsx` (transparentModal-Detail-Sheet)
- Modify: `app/_layout.tsx` (Route), `i18n/locales/en.ts` + `de.ts` (`injuries.badge_*`, `injuries.conflict_*` Keys)

**Interfaces:**
- Consumes: `workout_plans.injury_adjusted`, `injury_conflicts`, `description` (Task 7); `fetchActiveConstraints` (Task 2); `usePlan()`.
- Produces: sichtbares Badge „An deine Einschränkungen angepasst"; Tap → Sheet mit (1) aktiven Constraints (Klartext + Modus), (2) `workout_plans.description` (damit wird auch die bisher unsichtbare Arzt-Note endlich gerendert), (3) pro `injury_conflicts`-Eintrag Hinweis `injuries.conflict_sprints` („Deine Sprint-Priorität kollidiert aktuell mit deiner Verletzungsangabe — die Einheit enthält vorerst Technik/CoD.") + Button „Prioritäten anpassen" → Route in den Generieren-Wizard (Goals-Phase).

- [ ] **Step 1: i18n-Keys (en+de)**, **Step 2: Badge + Sheet implementieren** (Sheet-Muster wie gehabt; Konflikt-Texte pro Pillar-Slug, Fallback generisch), **Step 3: `npx tsc --noEmit` + Smoke gegen lokale DB** (leo2 regenerieren → Badge sichtbar, Arzt-Note im Sheet; Plan-Entscheidung: Session-Level-Hinweise entfallen bewusst — Spec nennt sie als „z. B.", es existiert keine Session-genaue Datengrundlage; Badge + Detail-Sheet erfüllen die Anforderung).
- [ ] **Step 4: Commit** — `feat(app): injury-adjusted badge + priority-conflict messaging`

---

## Self-Review (durchgeführt beim Schreiben)

- Spec-Coverage: §4 Extraktion → T1/T3/T5; §5 Confirm/Onboarding → T3; Rest-Gate inkl. a/b/c + Sackgassen-Freiheit + Paywall-Position → T5; Profil → T6; Strip bei Änderung → T6; Sichtbarkeit + Prio-Konflikt → T7/T8; §6 Akut → T3 (Screen) + T8 (Description endlich gerendert); Prompt-Ersetzungs-Konsistenz bei Notes-Änderung → T4. Analytics in T3/T5/T6 gefoldet.
- Bewusste Descope-Entscheidungen: Session-Level-Hinweise (T8 Step 3, „z. B."-Formulierung der Spec); tote Edge-Function `generate-trainings-plan` bleibt unberührt (separater Fast-Follow, memory `project_release_3_0_0`); `app/goals.tsx` ist unerreichbarer Legacy-Code — Prio-Anpassung routet in den Wizard, nicht dorthin.
