# Assessment Confirmation Modal — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

## Overview

Before the user's assessment result is saved, show a custom bottom-sheet confirmation modal that warns them they won't be able to update this value for 4 weeks. The user must explicitly confirm before the mutation fires.

---

## User Flow

```
User presses "Ergebnis speichern"
  → AssessmentConfirmModal appears (slide-up)
    → "Abbrechen" → modal closes, nothing saved
    → "Jetzt speichern" → modal closes → openWithPlacement('log_assessment', handleSubmit)
```

---

## Component: `AssessmentConfirmModal`

**File:** `components/modals/assessment-confirm-modal.tsx`

### Props

```ts
interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}
```

No `loading` prop — the modal itself has no loading state. After `onConfirm` is called the modal closes immediately; the loading indicator on the submit button in the screen behind handles pending state.

### Visual Structure

```
┌─────────────────────────────────┐
│             ─── (drag handle)   │
│                                 │
│  ⚠  (amber icon circle)  [✕]   │
│                                 │
│  Ergebnis speichern?            │  ← h2, theme.text
│                                 │
│  Sobald du dein Ergebnis        │  ← body-l, textMuted
│  speicherst, kannst du diesen   │
│  Wert erst in 4 Wochen wieder   │
│  aktualisieren.                 │
│                                 │
│  [ Abbrechen ]   (ghost btn)    │
│  [ Jetzt speichern ] (gradient) │
└─────────────────────────────────┘
        ↑ dark overlay backdrop
```

### Animation

Identical to `DeleteAccountModal`:
- `slideValue` (Reanimated `useSharedValue`): `600 → 0` on open, `0 → 600` on close
- `overlayValue`: `0 → 1` on open, `1 → 0` on close
- Durations: open 300ms slide / 250ms overlay; close 200ms both
- `runOnJS(onClose)()` called only after close animation finishes

### Backdrop

- `rgba(0,0,0,0.6)` — same as `DeleteAccountModal`
- Pressing backdrop calls `handleClose()` (same pattern)

### Icon

- `Ionicons name="warning-outline"` size 22, color `#f59e0b` (amber)
- Icon circle: `rgba(245,158,11,0.12)` background, 40×40, borderRadius 20

### Buttons

**Cancel button** — ghost style:
- `backgroundColor: theme.surface`
- `borderRadius: 14`, `paddingVertical: 16`
- Text: `body-l`, `theme.textMuted`

**Confirm button** — gradient:
- `LinearGradient` colors `[Cyan[500], Electric[500]]`
- `borderRadius: 14`, `paddingVertical: 16`
- Text: `body-l`, `'#fff'`

Both buttons sit in a `gap: 10` column below the text block.

---

## Integration: `app/assessment/[id].tsx`

### State

```ts
const [confirmVisible, setConfirmVisible] = useState(false);
```

### Submit button change

Before:
```tsx
onPress={() => openWithPlacement('log_assessment', handleSubmit)}
```

After:
```tsx
onPress={() => setConfirmVisible(true)}
```

The `disabled` condition stays unchanged.

### Modal placement

Add `<AssessmentConfirmModal>` just before `</SafeAreaView>`:

```tsx
<AssessmentConfirmModal
    visible={confirmVisible}
    onClose={() => setConfirmVisible(false)}
    onConfirm={() => {
        setConfirmVisible(false);
        openWithPlacement('log_assessment', handleSubmit);
    }}
/>
```

---

## i18n Keys

### `i18n/locales/de.ts`

```ts
// assessment-confirm-modal
'ui.assessment_confirm_title': 'Ergebnis speichern?',
'ui.assessment_confirm_body': 'Sobald du dein Ergebnis speicherst, kannst du diesen Wert erst in 4 Wochen wieder aktualisieren.',
'ui.assessment_confirm_cancel': 'Abbrechen',
'ui.assessment_confirm_submit': 'Jetzt speichern',
```

### `i18n/locales/en.ts`

```ts
// assessment-confirm-modal
'ui.assessment_confirm_title': 'Save result?',
'ui.assessment_confirm_body': 'Once you save your result, you won\'t be able to update this value for 4 weeks.',
'ui.assessment_confirm_cancel': 'Cancel',
'ui.assessment_confirm_submit': 'Save now',
```

---

## File Map

| Action | File |
|--------|------|
| **Create** | `components/modals/assessment-confirm-modal.tsx` |
| **Modify** | `app/assessment/[id].tsx` |
| **Modify** | `i18n/locales/de.ts` |
| **Modify** | `i18n/locales/en.ts` |

---

## Out of Scope

- Enforcing the 4-week cooldown on the backend (existing `user_assessments` renewal logic handles this)
- Showing remaining cooldown time in the modal
- Any changes to the mutation or Supabase logic
