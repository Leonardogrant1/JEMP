# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Clerk-protected admin panel to the JEMP Next.js landing page where an operator can view all exercises and fill in missing media (YouTube URL, thumbnail, video).

**Architecture:** Clerk (`@clerk/nextjs`) protects all `/admin/*` routes via `proxy.ts` (Next.js 16's renamed middleware). Exercise data is read and written via Server Actions using a Supabase service-role client. File uploads go directly from the browser to Supabase Storage via signed upload URLs (bypassing Vercel's body size limit).

**Tech Stack:** Next.js 16 (App Router), Clerk `@clerk/nextjs`, Supabase `@supabase/supabase-js`, TypeScript, Tailwind CSS v4

> **⚠️ Next.js 16 Breaking Change:** `middleware.ts` is renamed to `proxy.ts` and the export function is named `proxy` (not `middleware`). Clerk's docs may still reference the old name — ignore that, use `proxy.ts`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `proxy.ts` | Create | Auth guard — protects `/admin/*` via Clerk |
| `lib/supabase.ts` | Create | Server-only Supabase admin client |
| `app/actions/exercises.ts` | Create | Server Actions: getExercises, getExercise, getSignedUploadUrl, updateExercise |
| `app/layout.tsx` | Modify | Wrap with `ClerkProvider` |
| `app/sign-in/[[...sign-in]]/page.tsx` | Create | Clerk hosted sign-in UI |
| `app/admin/layout.tsx` | Create | Admin shell with header + UserButton |
| `app/admin/page.tsx` | Create | Exercise list (Server Component) |
| `app/admin/[id]/page.tsx` | Create | Exercise edit (Server Component — fetches data, renders form) |
| `app/admin/[id]/ExerciseEditForm.tsx` | Create | Edit form (Client Component — handles uploads + saves) |
| `.env.local` | Create | Env vars template |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

Run in `web/`:
```bash
cd /path/to/jemp/web
npm install @clerk/nextjs @supabase/supabase-js
```

Expected output: packages added, no peer dep errors.

- [ ] **Step 2: Create `.env.local` with required vars**

Create `web/.env.local`:
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin

# Supabase (server-only — no NEXT_PUBLIC_ prefix)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase (client — for building public storage URLs)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

> Fill in real values from Clerk Dashboard and Supabase project settings before running the dev server.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "feat(web): install clerk and supabase deps"
```

---

## Task 2: Supabase server client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create the client**

Create `web/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat(web): add supabase server client"
```

---

## Task 3: Clerk auth setup

**Files:**
- Create: `proxy.ts` (root of `web/`)
- Modify: `app/layout.tsx`
- Create: `app/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Create `proxy.ts`**

Create `web/proxy.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  if (isAdminRoute(req)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).+)',
  ],
}
```

> **Note:** If `clerkMiddleware` does not accept a named `proxy` export, wrap it:
> ```typescript
> const handler = clerkMiddleware(async (auth, req) => { ... })
> export const proxy = handler
> ```

- [ ] **Step 2: Wrap root layout with ClerkProvider**

Read `web/app/layout.tsx` first, then edit it:

```typescript
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "JEMP — Train like a pro athlete",
  description: "The training app built for serious athletes.",
  icons: {
    icon: "/logo.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="de">
        <body className="bg-brand-bg text-white font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 3: Create sign-in page**

Create `web/app/sign-in/[[...sign-in]]/page.tsx`:
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and verify auth redirect**

```bash
cd web && npm run dev
```

Open `http://localhost:3000/admin` — should redirect to `/sign-in`. Sign in with your Clerk account. Should redirect back to `/admin` (404 is fine at this point, redirect is what matters).

- [ ] **Step 5: Commit**

```bash
git add proxy.ts app/layout.tsx app/sign-in/
git commit -m "feat(web): add clerk auth guard and sign-in page"
```

---

## Task 4: Server Actions

**Files:**
- Create: `app/actions/exercises.ts`

- [ ] **Step 1: Create the actions file**

Create `web/app/actions/exercises.ts`:
```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export type Exercise = {
  id: string
  name: string
  slug: string
  youtube_url: string | null
  thumbnail_storage_path: string | null
  video_storage_path: string | null
}

export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, youtube_url, thumbnail_storage_path, video_storage_path')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function getExercise(id: string): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, slug, youtube_url, thumbnail_storage_path, video_storage_path')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getSignedUploadUrl(
  exerciseId: string,
  fileType: 'thumbnail' | 'video'
): Promise<{ signedUrl: string; path: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const ext = fileType === 'thumbnail' ? 'jpg' : 'mp4'
  const path = `${fileType}s/${exerciseId}.${ext}`

  const { data, error } = await supabase.storage
    .from('exercises')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, path }
}

export async function updateExercise(
  id: string,
  fields: {
    youtube_url?: string
    thumbnail_storage_path?: string
    video_storage_path?: string
  }
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('exercises')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
```

> **Note:** `@/lib/supabase` requires a `paths` alias in `tsconfig.json`. Check if `@/` is configured. If not, use relative path `../../lib/supabase` from this file's location — or add the alias:
> ```json
> // tsconfig.json — add inside "compilerOptions"
> "paths": { "@/*": ["./*"] }
> ```

- [ ] **Step 2: Verify TypeScript**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/exercises.ts tsconfig.json
git commit -m "feat(web): add exercise server actions"
```

---

## Task 5: Admin layout

**Files:**
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Create admin layout**

Create `web/app/admin/layout.tsx`:
```typescript
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/admin" className="text-lg font-semibold hover:opacity-80">
          JEMP Admin
        </Link>
        <UserButton />
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(web): add admin layout with header"
```

---

## Task 6: Exercise list page

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create the list page**

Create `web/app/admin/page.tsx`:
```typescript
import Link from 'next/link'
import { getExercises } from '../actions/exercises'

export default async function AdminPage() {
  const exercises = await getExercises()

  const withYoutube = exercises.filter(e => e.youtube_url).length
  const withThumbnail = exercises.filter(e => e.thumbnail_storage_path).length
  const withVideo = exercises.filter(e => e.video_storage_path).length

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        {exercises.length} exercises — {withYoutube} with YouTube, {withThumbnail} with thumbnail, {withVideo} with video
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Name</th>
            <th className="pb-3 pr-6 font-medium">Slug</th>
            <th className="pb-3 pr-4 font-medium">YouTube</th>
            <th className="pb-3 pr-4 font-medium">Thumbnail</th>
            <th className="pb-3 font-medium">Video</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map(exercise => (
            <tr
              key={exercise.id}
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors"
            >
              <td className="py-3 pr-6">
                <Link
                  href={`/admin/${exercise.id}`}
                  className="hover:underline"
                >
                  {exercise.name}
                </Link>
              </td>
              <td className="py-3 pr-6 text-gray-400 font-mono text-xs">
                {exercise.slug}
              </td>
              <td className="py-3 pr-4">
                <span className={exercise.youtube_url ? 'text-green-400' : 'text-red-500'}>
                  {exercise.youtube_url ? '✓' : '✗'}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={exercise.thumbnail_storage_path ? 'text-green-400' : 'text-red-500'}>
                  {exercise.thumbnail_storage_path ? '✓' : '✗'}
                </span>
              </td>
              <td className="py-3">
                <span className={exercise.video_storage_path ? 'text-green-400' : 'text-red-500'}>
                  {exercise.video_storage_path ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Open browser and verify**

Navigate to `http://localhost:3000/admin` (after signing in). Should show a table of all exercises with green/red indicators.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(web): add exercise list page"
```

---

## Task 7: Exercise edit page

**Files:**
- Create: `app/admin/[id]/page.tsx`
- Create: `app/admin/[id]/ExerciseEditForm.tsx`

- [ ] **Step 1: Create the Server Component wrapper**

Create `web/app/admin/[id]/page.tsx`:
```typescript
import Link from 'next/link'
import { getExercise } from '../../actions/exercises'
import { ExerciseEditForm } from './ExerciseEditForm'

// In Next.js 15+, params is a Promise
export default async function ExerciseEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exercise = await getExercise(id)

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-gray-400 hover:text-white mb-6 block"
      >
        ← Back to exercises
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{exercise.name}</h2>
      <ExerciseEditForm exercise={exercise} />
    </div>
  )
}
```

- [ ] **Step 2: Create the Client Component form**

Create `web/app/admin/[id]/ExerciseEditForm.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import {
  getSignedUploadUrl,
  updateExercise,
  type Exercise,
} from '../../actions/exercises'

type Props = { exercise: Exercise }

type Statuses = {
  youtube?: string
  thumbnail?: string
  video?: string
}

export function ExerciseEditForm({ exercise: initial }: Props) {
  const [exercise, setExercise] = useState(initial)
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '')
  const [statuses, setStatuses] = useState<Statuses>({})
  const [isPending, startTransition] = useTransition()

  const setStatus = (field: keyof Statuses, msg: string) =>
    setStatuses(s => ({ ...s, [field]: msg }))

  const saveYoutube = () => {
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, { youtube_url: youtubeUrl })
        setExercise(e => ({ ...e, youtube_url: youtubeUrl }))
        setStatus('youtube', 'Saved ✓')
      } catch {
        setStatus('youtube', 'Error saving')
      }
    })
  }

  const uploadFile = async (file: File, fileType: 'thumbnail' | 'video') => {
    setStatus(fileType, 'Uploading...')
    try {
      const { signedUrl, path } = await getSignedUploadUrl(exercise.id, fileType)

      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)

      const field =
        fileType === 'thumbnail'
          ? 'thumbnail_storage_path'
          : 'video_storage_path'
      await updateExercise(exercise.id, { [field]: path })
      setExercise(e => ({ ...e, [field]: path }))
      setStatus(fileType, 'Saved ✓')
    } catch (err) {
      setStatus(fileType, err instanceof Error ? err.message : 'Error uploading')
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="space-y-6">
      {/* YouTube */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          YouTube URL
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <button
            onClick={saveYoutube}
            disabled={isPending}
            className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
        {statuses.youtube && (
          <p className="text-xs text-gray-400 mt-2">{statuses.youtube}</p>
        )}
      </section>

      {/* Thumbnail */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Thumbnail
        </h3>
        {exercise.thumbnail_storage_path && supabaseUrl && (
          <img
            src={`${supabaseUrl}/storage/v1/object/public/exercises/${exercise.thumbnail_storage_path}`}
            alt="Current thumbnail"
            className="w-40 h-24 object-cover rounded mb-4 border border-gray-700"
          />
        )}
        {exercise.thumbnail_storage_path && (
          <p className="text-xs text-gray-500 font-mono mb-3">
            {exercise.thumbnail_storage_path}
          </p>
        )}
        <input
          type="file"
          accept="image/*"
          className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file, 'thumbnail')
          }}
        />
        {statuses.thumbnail && (
          <p className="text-xs text-gray-400 mt-2">{statuses.thumbnail}</p>
        )}
      </section>

      {/* Video */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Video
        </h3>
        {exercise.video_storage_path && (
          <p className="text-xs text-gray-500 font-mono mb-3">
            {exercise.video_storage_path}
          </p>
        )}
        <input
          type="file"
          accept="video/mp4,video/*"
          className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file, 'video')
          }}
        />
        {statuses.video && (
          <p className="text-xs text-gray-400 mt-2">{statuses.video}</p>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Test in browser**

1. Navigate to `/admin` — click any exercise row
2. Should load the edit page with the exercise name
3. Edit YouTube URL → click Save → status shows "Saved ✓"
4. Upload a thumbnail image → status shows "Uploading..." then "Saved ✓" → image preview appears
5. Go back to `/admin` — the exercise row should now show ✓ for the updated fields

- [ ] **Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat(web): add exercise edit page with file upload"
```

---

## Done

All exercises are listed at `/admin` with media status indicators. Clicking an exercise opens the edit form where YouTube URL, thumbnail, and video can be set. Files upload directly from the browser to Supabase Storage via signed URLs — no Vercel body limit issues.
