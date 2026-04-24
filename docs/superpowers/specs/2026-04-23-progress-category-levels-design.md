# Progress Screen — Category Levels Section

**Date:** 2026-04-23  
**Scope:** Top section of `app/(tabs)/progress.tsx` showing the user's level per training category.

---

## Goal

Display the user's current `level_score` (1–100) for each of the 5 training categories at the top of the Progress tab. The user can see at a glance how they rank in each area.

---

## Data

**Source table:** `user_category_levels`  
Fields used: `category_id`, `level_score` (integer, 1–100)

**New query:** `queries/use-user-category-levels-query.ts`
- Fetches `user_category_levels` joined with `categories(slug)` for the current user
- Returns `Map<slug, level_score>` (or `Record<string, number>`)
- `staleTime: 5 * 60 * 1000`
- Enabled only when `userId` is defined

---

## Layout

Fixed category order — not dynamic:

```
[ strength ]  [ jumps          ]
[ lower_body_plyometrics ] [ upper_body_plyometrics ]
[          mobility           ]  ← full width
```

Rendered as two flex rows (2 cards each) + one full-width card below.

---

## Card Anatomy

```
┌──────────────────────────────┐
│ 🏋  Icon         Lvl 42 │  ← icon (Ionicons, cat color) + pill badge
│                              │
│ STRENGTH                     │  ← category name, uppercase, textMuted
│ 42/100                       │  ← level_score bold + "/100" in textSubtle
└──────────────────────────────┘
```

- **Background:** `theme.surface`
- **Border:** 1px `cat.borderColor`
- **Border radius:** 18
- **Icon:** `CATEGORY_ICONS[slug]`, size 22, color `cat.color`
- **Lvl badge:** `Lvl {score}` in a small pill — `theme.background` bg, `theme.textMuted` text
- **Score number:** Large (`h2`-ish), color `cat.color`
- **"/100" suffix:** Same line, smaller, `theme.textSubtle`
- **No level entry:** Score shows `—`, no Lvl badge rendered

---

## Files Changed

| File | Change |
|------|--------|
| `queries/use-user-category-levels-query.ts` | New — fetches category levels |
| `app/(tabs)/progress.tsx` | Add category levels section at top |

---

## Out of Scope

- Historical level progression / charts
- Editing or triggering assessments from this screen
- Overall/aggregate level score
