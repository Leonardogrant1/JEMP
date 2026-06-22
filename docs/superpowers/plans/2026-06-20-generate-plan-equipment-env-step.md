# Equipment-Environment Step in generate-plan.tsx — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `equipment-env` phase between `equipment` and `goals` in `generate-plan.tsx` that lets the user assign ambiguous equipment (compatible with 2+ selected environments) to their specific locations — auto-skipped when there's no ambiguity.

**Architecture:** All changes are inline in `app/generate-plan.tsx`. A new `AmbiguousItem` type + two new state variables drive the UI. `handleEquipmentNext()` replaces the `goToEquipment()` inline call and decides whether to show the new phase or skip it. `generate()` step 4b is updated to use the user's explicit selections.

**Tech Stack:** React Native, Expo Router, Supabase, TypeScript, react-i18next (existing i18n keys reused)

## Global Constraints

- Only `app/generate-plan.tsx` is modified — no new files
- Reuse existing i18n keys: `onboarding.equipment_location_title`, `onboarding.equipment_location_subtitle`
- `user_equipment_environments` table is accessed via `(supabase as any)` (no TS type generated yet — matches existing pattern in the file)
- No new dependencies

---

### Task 1: Add type, state, and pre-fill load

**Files:**
- Modify: `app/generate-plan.tsx`

**Interfaces:**
- Produces:
  - `AmbiguousItem` interface (used by Task 2 and Task 3)
  - `ambiguousEquipment: AmbiguousItem[]` state (used by Task 3)
  - `equipmentEnvSelections: Map<string, Set<string>>` state (used by Task 2 and Task 4)
  - `savedEquipmentEnvMappings: { equipment_id: string; environment_id: string }[]` state (used by Task 2)

- [ ] **Step 1: Add `AmbiguousItem` interface near the other interfaces (around line 36)**

  After the existing `interface EquipmentItem { ... }` line, add:

  ```ts
  interface AmbiguousItem { id: string; slug: string; name_i18n: Record<string, string> | null; compatibleEnvIds: string[] }
  ```

- [ ] **Step 2: Add three new state variables after the existing Equipment state block (around line 123)**

  After `const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());`, add:

  ```ts
  // Equipment-environment mapping
  const [ambiguousEquipment, setAmbiguousEquipment] = useState<AmbiguousItem[]>([]);
  const [equipmentEnvSelections, setEquipmentEnvSelections] = useState<Map<string, Set<string>>>(new Map());
  const [savedEquipmentEnvMappings, setSavedEquipmentEnvMappings] = useState<{ equipment_id: string; environment_id: string }[]>([]);
  ```

- [ ] **Step 3: Add 7th query to the `Promise.all` block (around line 172)**

  Change the `Promise.all([` array to include a 7th entry:

  ```ts
  Promise.all([
      supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
      supabase.from('user_equipments').select('equipment_id').eq('user_id', profile.id),
      supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
      supabase.from('categories').select('id, slug, name_i18n'),
      supabase.from('user_targeted_categories').select('category_id, priority').eq('user_id', profile.id).order('priority'),
      supabase.from('user_environments').select('environment_id').eq('user_id', profile.id),
      (supabase as any).from('user_equipment_environments').select('equipment_id, environment_id').eq('user_id', profile.id),
  ]).then(async ([envsRes, userEquipRes, envEqRes, catsRes, targetedRes, userEnvsRes, userEqEnvRes]) => {
  ```

- [ ] **Step 4: Store the loaded mappings at the end of the `.then()` block, just before `setLoading(false)`**

  ```ts
  setSavedEquipmentEnvMappings(userEqEnvRes.data ?? []);
  setLoading(false);
  ```

- [ ] **Step 5: Verify the app still starts and loads the generate-plan screen without errors**

  Open the app, navigate to the generate plan screen, check console for errors.

- [ ] **Step 6: Commit**

  ```bash
  git add app/generate-plan.tsx
  git commit -m "feat: add equipment-env state and pre-fill load in generate-plan"
  ```

---

### Task 2: Add navigation logic

**Files:**
- Modify: `app/generate-plan.tsx`

**Interfaces:**
- Consumes: `ambiguousEquipment`, `equipmentEnvSelections`, `savedEquipmentEnvMappings`, `AmbiguousItem` (from Task 1)
- Produces: `handleEquipmentNext()`, updated `goBack()`, updated `handleNext()`, updated `canProceedNext`

- [ ] **Step 1: Add `toggleEquipmentEnv` helper after `toggleEquipment` (around line 269)**

  ```ts
  function toggleEquipmentEnv(equipmentId: string, envId: string) {
      setEquipmentEnvSelections(prev => {
          const next = new Map(prev);
          const envSet = new Set(next.get(equipmentId) ?? []);
          envSet.has(envId) ? envSet.delete(envId) : envSet.add(envId);
          next.set(equipmentId, envSet);
          return next;
      });
  }
  ```

- [ ] **Step 2: Replace `goToEquipment()` with `handleEquipmentNext()`**

  Remove the existing `goToEquipment()` function (lines 252–261):
  ```ts
  function goToEquipment() {
      const map = new Map<string, EquipmentItem>();
      for (const envId of selectedEnvIds) {
          for (const eq of equipmentByEnv.get(envId) ?? []) {
              if (!map.has(eq.id)) map.set(eq.id, eq);
          }
      }
      setAllEquipment([...map.values()].sort((a, b) => a.slug.localeCompare(b.slug)));
      setPhase('equipment');
  }
  ```

  Replace with:
  ```ts
  function goToEquipment() {
      const map = new Map<string, EquipmentItem>();
      for (const envId of selectedEnvIds) {
          for (const eq of equipmentByEnv.get(envId) ?? []) {
              if (!map.has(eq.id)) map.set(eq.id, eq);
          }
      }
      setAllEquipment([...map.values()].sort((a, b) => a.slug.localeCompare(b.slug)));
      setPhase('equipment');
  }

  function handleEquipmentNext() {
      // Find equipment compatible with 2+ selected environments
      const eqToEnvs = new Map<string, Set<string>>();
      for (const envId of selectedEnvIds) {
          for (const eq of equipmentByEnv.get(envId) ?? []) {
              if (!selectedEquipmentIds.has(eq.id)) continue;
              if (!eqToEnvs.has(eq.id)) eqToEnvs.set(eq.id, new Set());
              eqToEnvs.get(eq.id)!.add(envId);
          }
      }

      // Build selections: auto-assign unambiguous, collect ambiguous for UI
      const selections = new Map<string, Set<string>>();
      const ambiguous: AmbiguousItem[] = [];

      // Restore saved mappings grouped by equipment
      const savedByEq = new Map<string, Set<string>>();
      for (const m of savedEquipmentEnvMappings) {
          if (!savedByEq.has(m.equipment_id)) savedByEq.set(m.equipment_id, new Set());
          savedByEq.get(m.equipment_id)!.add(m.environment_id);
      }

      for (const [eqId, envIds] of eqToEnvs) {
          if (envIds.size > 1) {
              // Ambiguous: will be shown in UI
              const eqItem = allEquipment.find(e => e.id === eqId);
              if (eqItem) {
                  ambiguous.push({ id: eqId, slug: eqItem.slug, name_i18n: eqItem.name_i18n, compatibleEnvIds: [...envIds] });
              }
              // Restore saved selection or default to all compatible envs
              selections.set(eqId, savedByEq.get(eqId) ?? new Set(envIds));
          } else {
              // Unambiguous: auto-assign
              selections.set(eqId, new Set(envIds));
          }
      }

      setEquipmentEnvSelections(selections);

      if (ambiguous.length === 0) {
          setGoalsSubPhase('select');
          setPhase('goals');
      } else {
          setAmbiguousEquipment(ambiguous);
          setPhase('equipment-env');
      }
  }
  ```

- [ ] **Step 3: Update `goBack()` — add the `equipment-env → equipment` case**

  In `goBack()`, the current first line is:
  ```ts
  if (phase === 'environment') setPhase('sport');
  else if (phase === 'equipment') setPhase('environment');
  else if (phase === 'goals') {
  ```

  Change to:
  ```ts
  if (phase === 'environment') setPhase('sport');
  else if (phase === 'equipment') setPhase('environment');
  else if (phase === 'equipment-env') setPhase('equipment');
  else if (phase === 'goals') {
  ```

- [ ] **Step 4: Update `handleNext()` — change the `equipment` case to call `handleEquipmentNext()`**

  Change:
  ```ts
  else if (phase === 'equipment') { setGoalsSubPhase('select'); setPhase('goals'); }
  ```
  To:
  ```ts
  else if (phase === 'equipment') handleEquipmentNext();
  else if (phase === 'equipment-env') { setGoalsSubPhase('select'); setPhase('goals'); }
  ```

- [ ] **Step 5: Update `canProceedNext` — `equipment-env` is always true (optional step)**

  Current:
  ```ts
  const canProceedNext =
      phase === 'sport' ? canProceedSport :
          phase === 'environment' ? canProceedEnv :
              phase === 'goals' ? selectedCategoryIds.size > 0 :
                  phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
                      true;
  ```

  Change to:
  ```ts
  const canProceedNext =
      phase === 'sport' ? canProceedSport :
          phase === 'environment' ? canProceedEnv :
              phase === 'goals' ? selectedCategoryIds.size > 0 :
                  phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
                      true;
  ```

  _(No change needed — the final `true` fallback already covers `equipment-env`.)_

- [ ] **Step 6: Update the `Phase` type and `PHASES` array to include `'equipment-env'`**

  Change line 33:
  ```ts
  type Phase = 'sport' | 'environment' | 'equipment' | 'equipment-env' | 'goals' | 'body' | 'schedule' | 'weekly';
  ```

  Change line 41:
  ```ts
  const PHASES: Phase[] = ['sport', 'environment', 'equipment', 'equipment-env', 'goals', 'body', 'schedule', 'weekly'];
  ```

- [ ] **Step 7: Verify navigation works**

  - Select 1 environment → equipment phase → pressing Continue skips straight to goals ✓
  - Select 2+ environments with overlapping equipment → pressing Continue shows `equipment-env` phase ✓
  - Back from `equipment-env` goes back to `equipment` ✓
  - Step bars show 8 bars and progress correctly ✓

- [ ] **Step 8: Commit**

  ```bash
  git add app/generate-plan.tsx
  git commit -m "feat: add equipment-env navigation logic in generate-plan"
  ```

---

### Task 3: Add equipment-env UI phase

**Files:**
- Modify: `app/generate-plan.tsx`

**Interfaces:**
- Consumes: `ambiguousEquipment`, `equipmentEnvSelections`, `toggleEquipmentEnv`, `allEnvs`, `locale` (all from earlier tasks)

- [ ] **Step 1: Add the `equipment-env` phase JSX block**

  In the render section, after the `{/* ── Equipment ── */}` block (around line 524) and before `{/* ── Goals ── */}`, add:

  ```tsx
  {/* ── Equipment environment ── */}
  {phase === 'equipment-env' && (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
              {t('onboarding.equipment_location_title')}
          </JempText>
          <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
              {t('onboarding.equipment_location_subtitle')}
          </JempText>
          {ambiguousEquipment.map(eq => {
              const eqSelections = equipmentEnvSelections.get(eq.id) ?? new Set<string>();
              return (
                  <View key={eq.id} style={styles.equipmentEnvRow}>
                      <JempText type="body-l" color={theme.text} style={styles.equipmentEnvLabel}>
                          {eq.name_i18n?.[locale] ?? eq.slug}
                      </JempText>
                      <View style={styles.chipGrid}>
                          {eq.compatibleEnvIds.map(envId => {
                              const env = allEnvs.find(e => e.id === envId);
                              if (!env) return null;
                              return (
                                  <SelectableChip
                                      key={envId}
                                      label={env.name_i18n?.[locale] ?? env.slug}
                                      selected={eqSelections.has(envId)}
                                      onPress={() => toggleEquipmentEnv(eq.id, envId)}
                                  />
                              );
                          })}
                      </View>
                  </View>
              );
          })}
      </ScrollView>
  )}
  ```

- [ ] **Step 2: Add the two new style entries to `StyleSheet.create`**

  After the `envList` style:
  ```ts
  equipmentEnvRow: { marginBottom: 24 },
  equipmentEnvLabel: { marginBottom: 10 },
  ```

- [ ] **Step 3: Verify UI**

  - With 2+ overlapping environments and equipment: `equipment-env` screen shows each ambiguous piece of equipment with chips for each compatible environment
  - Tapping a chip toggles selection
  - Previously saved mappings are pre-selected on re-entry
  - Pressing Continue proceeds to `goals`

- [ ] **Step 4: Commit**

  ```bash
  git add app/generate-plan.tsx
  git commit -m "feat: render equipment-env phase UI in generate-plan"
  ```

---

### Task 4: Update generate() to use explicit equipmentEnvSelections

**Files:**
- Modify: `app/generate-plan.tsx`

**Interfaces:**
- Consumes: `equipmentEnvSelections`, `selectedEquipmentIds` (existing)

- [ ] **Step 1: Replace step 4b in `generate()` (around lines 348–360)**

  Remove:
  ```ts
  // 4b. Update equipment-environment mapping (which equipment is in which environment)
  await (supabase as any).from('user_equipment_environments').delete().eq('user_id', profile.id);
  const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
  for (const envId of selectedEnvIds) {
      for (const eq of equipmentByEnv.get(envId) ?? []) {
          if (selectedEquipmentIds.has(eq.id)) {
              equipEnvRows.push({ user_id: profile.id, equipment_id: eq.id, environment_id: envId });
          }
      }
  }
  if (equipEnvRows.length > 0) {
      await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
  }
  ```

  Replace with:
  ```ts
  // 4b. Update equipment-environment mapping (which equipment is in which environment)
  await (supabase as any).from('user_equipment_environments').delete().eq('user_id', profile.id);
  const equipEnvRows: { user_id: string; equipment_id: string; environment_id: string }[] = [];
  for (const [equipmentId, envIds] of equipmentEnvSelections) {
      if (selectedEquipmentIds.has(equipmentId)) {
          for (const envId of envIds) {
              equipEnvRows.push({ user_id: profile.id, equipment_id: equipmentId, environment_id: envId });
          }
      }
  }
  if (equipEnvRows.length > 0) {
      await (supabase as any).from('user_equipment_environments').insert(equipEnvRows);
  }
  ```

- [ ] **Step 2: Verify full flow end-to-end**

  Scenario A — Single environment:
  - Select 1 env, select equipment, no `equipment-env` phase appears
  - Tap "Create" → plan generates, `user_equipment_environments` contains auto-assigned rows

  Scenario B — Multiple overlapping environments:
  - Select 2+ envs with shared equipment, assign equipment to environments
  - Tap "Create" → `user_equipment_environments` contains exactly the rows matching user selections

  Scenario C — Re-entry:
  - Open generate-plan a second time → `equipment-env` phase pre-fills with previously saved mappings

- [ ] **Step 3: Commit**

  ```bash
  git add app/generate-plan.tsx
  git commit -m "feat: use explicit equipmentEnvSelections in generate() step 4b"
  ```
