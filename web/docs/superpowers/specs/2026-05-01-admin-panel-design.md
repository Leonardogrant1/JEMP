# Admin Panel — Design Spec

**Date:** 2026-05-01  
**Scope:** `web/` (Next.js 16 landing page)

---

## Goal

Add a protected admin panel to the JEMP landing page where a single operator can review all exercises and fill in missing media (YouTube URL, thumbnail, video).

---

## Auth

- **Provider:** Clerk (`@clerk/nextjs`)
- **Strategy:** Login-only — no registration link shown
- **Protection:** `middleware.ts` guards all `/admin` routes via `clerkMiddleware` + `createRouteMatcher`
- **Sign-in page:** Clerk hosted UI at `/sign-in`
- Unauthenticated requests to `/admin/*` redirect to `/sign-in`

---

## File Structure

```
web/
├── middleware.ts                        ← Clerk route guard
├── lib/
│   └── supabase.ts                      ← Server-only Supabase admin client
├── app/
│   ├── layout.tsx                       ← Add ClerkProvider wrapper
│   ├── admin/
│   │   ├── layout.tsx                   ← Admin shell (header, sign-out button)
│   │   ├── page.tsx                     ← Exercise list (Server Component)
│   │   └── [id]/
│   │       └── page.tsx                 ← Exercise edit (Client Component)
│   └── actions/
│       └── exercises.ts                 ← Server Actions
```

---

## Data Layer

### `lib/supabase.ts`

Server-only Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars. Never imported from Client Components.

### Server Actions (`app/actions/exercises.ts`)

Three actions:

1. **`getExercises()`** — Fetches all exercises, selecting `id`, `name`, `slug`, `youtube_url`, `thumbnail_storage_path`, `video_storage_path`. Returns sorted by `name`.

2. **`getExercise(id)`** — Fetches a single exercise by ID (same fields + description for display).

3. **`getSignedUploadUrl(exerciseId, fileType)`** — Generates a Supabase signed upload URL for a given path. `fileType` is `'thumbnail' | 'video'`. Path format: `thumbnails/{exerciseId}.jpg` or `videos/{exerciseId}.mp4`. Returns `{ signedUrl, path }`.

4. **`updateExercise(id, data)`** — Updates `youtube_url`, `thumbnail_storage_path`, and/or `video_storage_path` on the exercise row. Validates that the caller is authenticated via `auth()` from Clerk before writing.

---

## Exercise List (`/admin`)

**Type:** Server Component

**Layout:** Full-width table with columns:
- Name
- Slug
- YouTube (✓ green / ✗ red)
- Thumbnail (✓ green / ✗ red)  
- Video (✓ green / ✗ red)

Each row is a link to `/admin/[id]`.

A summary line above the table shows counts: e.g. "142 exercises — 80 with YouTube, 12 with thumbnail, 3 with video."

---

## Exercise Edit (`/admin/[id]`)

**Type:** Client Component (needs file input interactivity)

**Layout:** Back link → Exercise name as heading → three form sections:

### YouTube URL
- Text input pre-filled with current value
- Save button → calls `updateExercise(id, { youtube_url })`

### Thumbnail
- Shows current thumbnail if `thumbnail_storage_path` is set (via Supabase public URL)
- File input (accept: `image/*`)
- On file select:
  1. Call `getSignedUploadUrl(id, 'thumbnail')` → get `{ signedUrl, path }`
  2. `PUT` file directly to `signedUrl` from the browser (bypasses Vercel body limit)
  3. Call `updateExercise(id, { thumbnail_storage_path: path })`

### Video
- Same pattern as Thumbnail (accept: `video/mp4`)
- Shows current path as text if set (no inline preview needed)

**Error handling:** Each section shows inline success/error state independently. No full-page reload after save.

---

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...   ← needed for public Storage URLs in the edit form
```

---

## Dependencies to Install

```
@clerk/nextjs
@supabase/supabase-js
```

---

## Out of Scope

- Creating or deleting exercises
- Editing name, description, movement pattern, or any other fields
- Multi-user roles or permissions
- Pagination (exercise count ~150, fits one page)
