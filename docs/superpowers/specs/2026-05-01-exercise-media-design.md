# Exercise Media Design

**Date:** 2026-05-01  
**Status:** Approved

## Overview

Add exercise thumbnail and video support across the app. Exercises have a `thumbnail_storage_path` and `video_storage_path` stored in a public Supabase Storage bucket. The app currently ignores both fields and shows a static placeholder everywhere. This spec covers loading real media with graceful fallbacks.

---

## Storage

- Bucket: `exercises` (public, no signed URLs needed)
- URL construction: `supabase.storage.from('exercises').getPublicUrl(path).data.publicUrl`
- Thumbnails and videos live in the same bucket under separate paths

---

## 1. Storage URL Helper

**File:** `helpers/exercise-storage.ts`

Two pure functions:

```ts
exerciseThumbnailUrl(path: string | null): string | null
exerciseVideoUrl(path: string | null): string | null
```

Both call `getPublicUrl()` and return `null` if no path. Pure functions — no hook needed since public URLs are stable and cacheable.

---

## 2. Thumbnail Loading (3 screens)

Applies to: `app/session/[id].tsx`, `app/exercise/[id].tsx`, `app/active-session/[id].tsx`

**Logic:**
```
thumbnail_storage_path present
  → exerciseThumbnailUrl(path) → Image source: { uri: url }
no path
  → PLACEHOLDER (splash-icon.png)
```

Query changes needed:
- `session/[id]` and `exercise/[id]`: `thumbnail_storage_path` already selected — no change
- `active-session/[id]`: `thumbnail_storage_path` **missing** from the query — must be added

---

## 3. Video Hero in `exercise/[id]`

### Query change

`use-exercise-detail-query.ts`: add `video_storage_path` to the select.

### New component: `ExerciseVideoHero`

Extracted from the inline `videoHero` block in `exercise/[id].tsx`. Encapsulates the three-way media logic and keeps the screen readable.

**Props:**
```ts
{
  videoStoragePath: string | null
  youtubeUrl: string | null
  thumbnailStoragePath: string | null
  exerciseId: string
}
```

**Priority chain:**

| Priority | Condition | Behavior |
|----------|-----------|----------|
| 1 | `video_storage_path` present | `expo-video` inline player with controls |
| 2 | `youtube_url` present | `react-native-youtube-iframe` embedded |
| 3 | Neither | Static thumbnail (or placeholder), no play button |

**expo-video:** Used for Supabase-hosted MP4 files. Renders inline with native controls. No external app opened.

**react-native-youtube-iframe:** Fallback for exercises that only have a YouTube link. Expected to be rarely used once all exercises have uploaded videos.

**Thumbnail (static case):** Uses `thumbnail_storage_path` → placeholder, same logic as section 2.

---

## 4. Back Button Fix (`exercise/[id]`)

**Problem:** `backBtn` Pressable is inside `<ScrollView>`, so it scrolls away with content.

**Fix:** Move the back button out of `<ScrollView>`. Place it as a direct child of `<SafeAreaView>`, absolutely positioned. The `ScrollView` and back button become siblings — back button stays fixed while content scrolls beneath it.

---

## Affected Files

| File | Change |
|------|--------|
| `helpers/exercise-storage.ts` | New — public URL helpers |
| `components/exercise-video-hero.tsx` | New — video/thumbnail hero component |
| `queries/use-exercise-detail-query.ts` | Add `video_storage_path` to select |
| `app/active-session/[id].tsx` query | Add `thumbnail_storage_path` to select |
| `app/exercise/[id].tsx` | Use `ExerciseVideoHero`, fix back button, use thumbnail helper |
| `app/session/[id].tsx` | Use thumbnail helper instead of static placeholder |
| `app/active-session/[id].tsx` | Use thumbnail helper instead of static placeholder |

---

## Out of Scope

- Uploading videos/thumbnails to storage (content management)
- Video playback in `session/[id]` or `active-session/[id]` (thumbnail only)
- Caching / prefetching media
