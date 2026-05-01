# Exercise Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load real exercise thumbnails and videos from Supabase Storage (with YouTube and placeholder fallbacks) across session, exercise-detail, and active-session screens.

**Architecture:** A small pure helper (`helpers/exercise-storage.ts`) builds public Supabase Storage URLs from storage paths. A new `ExerciseVideoHero` component encapsulates the 3-way video priority (Supabase video → YouTube iframe → static image). Three screens swap their static placeholder for the real thumbnail URL. The back button in `exercise/[id]` is moved outside the ScrollView so it stays fixed.

**Tech Stack:** expo-video (already installed), react-native-youtube-iframe (to install), expo-image (already used), Supabase JS client

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `helpers/exercise-storage.ts` | Create | Build public Supabase Storage URLs for thumbnails and videos |
| `components/exercise-video-hero.tsx` | Create | 3-way video priority: expo-video / YouTube iframe / static image |
| `queries/use-exercise-detail-query.ts` | Modify | Add `video_storage_path` to select |
| `app/exercise/[id].tsx` | Modify | Use ExerciseVideoHero, fix back button, use thumbnail helper |
| `app/session/[id].tsx` | Modify | Swap static PLACEHOLDER_THUMB for thumbnail helper |
| `app/active-session/[id].tsx` | Modify | Swap YouTube-only thumbnail for thumbnail helper with YouTube fallback |

---

## Task 1: Install react-native-youtube-iframe

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npx expo install react-native-youtube-iframe
```

Expected: package added to `package.json` and `node_modules`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-native-youtube-iframe"
```

---

## Task 2: Create exercise-storage helper

**Files:**
- Create: `helpers/exercise-storage.ts`

**Assumption:** The Supabase Storage bucket is named `exercises` and is set to public. If you name it differently when creating it in the Supabase dashboard, update the bucket name here.

- [ ] **Step 1: Create the helper**

Create `helpers/exercise-storage.ts`:

```typescript
import { supabase } from '@/services/supabase/client';

const BUCKET = 'exercises';

export function exerciseThumbnailUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function exerciseVideoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add helpers/exercise-storage.ts
git commit -m "feat: add exercise storage URL helpers"
```

---

## Task 3: Add video_storage_path to exercise detail query

**Files:**
- Modify: `queries/use-exercise-detail-query.ts`

- [ ] **Step 1: Add the field to the select**

In `queries/use-exercise-detail-query.ts`, find the select string (lines 8–15). Add `video_storage_path` next to `thumbnail_storage_path`:

```typescript
        .select(`
            id, name, slug, description, description_i18n, body_region, movement_pattern,
            min_level, max_level, youtube_url, thumbnail_storage_path, video_storage_path,
            category:categories ( slug ),
            exercise_equipments ( equipment:equipments ( slug, name_i18n ) ),
            exercise_blocks ( block_type:block_types ( slug ) )
        `)
```

- [ ] **Step 2: Commit**

```bash
git add queries/use-exercise-detail-query.ts
git commit -m "feat: fetch video_storage_path in exercise detail query"
```

---

## Task 4: Create ExerciseVideoHero component

**Files:**
- Create: `components/exercise-video-hero.tsx`

This component encapsulates the 3-way priority:
1. `videoStoragePath` present → `expo-video` inline player
2. `youtubeUrl` present → `react-native-youtube-iframe` embedded player
3. Neither → static thumbnail image (or placeholder)

The `Pressable` wrapper is only rendered in case 3 (static), and only opens YouTube if `youtubeUrl` is set.

- [ ] **Step 1: Create the component**

Create `components/exercise-video-hero.tsx`:

```typescript
import { exerciseThumbnailUrl, exerciseVideoUrl } from '@/helpers/exercise-storage';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { trackerManager } from '@/lib/tracking/tracker-manager';

const PLACEHOLDER = require('@/assets/images/splash-icon.png');

const HERO_HEIGHT = 240;

function extractYoutubeId(url: string): string | null {
    const match = url.match(/(?:v=|\/)([\w-]{11})/);
    return match?.[1] ?? null;
}

type Props = {
    videoStoragePath: string | null | undefined;
    youtubeUrl: string | null | undefined;
    thumbnailStoragePath: string | null | undefined;
    exerciseId: string;
};

// Sub-component: expo-video player for Supabase-hosted videos
function StorageVideoPlayer({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, p => {
        p.loop = false;
    });

    return (
        <VideoView
            player={player}
            style={styles.hero}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
        />
    );
}

// Sub-component: YouTube iframe embed
function YoutubePlayer({ videoId }: { videoId: string }) {
    return (
        <View style={styles.hero}>
            <YoutubeIframe height={HERO_HEIGHT} videoId={videoId} play={false} />
        </View>
    );
}

// Sub-component: static thumbnail with optional play button overlay
function StaticHero({
    thumbnailStoragePath,
    youtubeUrl,
    exerciseId,
}: {
    thumbnailStoragePath: string | null | undefined;
    youtubeUrl: string | null | undefined;
    exerciseId: string;
}) {
    const thumbUrl = exerciseThumbnailUrl(thumbnailStoragePath);
    const source = thumbUrl ? { uri: thumbUrl } : PLACEHOLDER;

    return (
        <Pressable
            style={styles.hero}
            onPress={() => {
                if (youtubeUrl) {
                    trackerManager.track('exercise_video_started', { exercise_id: exerciseId });
                    Linking.openURL(youtubeUrl);
                }
            }}
            disabled={!youtubeUrl}
        >
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                locations={[0.4, 1]}
                style={StyleSheet.absoluteFill}
            />
            {youtubeUrl && (
                <View style={styles.playButton}>
                    <Ionicons name="play" size={28} color="#fff" />
                </View>
            )}
        </Pressable>
    );
}

export function ExerciseVideoHero({ videoStoragePath, youtubeUrl, thumbnailStoragePath, exerciseId }: Props) {
    const videoUri = exerciseVideoUrl(videoStoragePath);

    if (videoUri) {
        return <StorageVideoPlayer uri={videoUri} />;
    }

    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;
    if (youtubeId) {
        return <YoutubePlayer videoId={youtubeId} />;
    }

    return (
        <StaticHero
            thumbnailStoragePath={thumbnailStoragePath}
            youtubeUrl={youtubeUrl}
            exerciseId={exerciseId}
        />
    );
}

const styles = StyleSheet.create({
    hero: {
        height: HERO_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/exercise-video-hero.tsx
git commit -m "feat: add ExerciseVideoHero component with 3-way media priority"
```

---

## Task 5: Update exercise/[id].tsx

**Files:**
- Modify: `app/exercise/[id].tsx`

Two changes:
1. Replace the inline `videoHero` block + back button with `ExerciseVideoHero` + fixed back button
2. Use `exerciseThumbnailUrl` for the thumbnail source (inside ExerciseVideoHero — already handled)

The back button must be a **sibling** of `<ScrollView>` inside `<SafeAreaView>`, not inside the scroll content.

- [ ] **Step 1: Update imports**

Replace the top of `app/exercise/[id].tsx`. Remove the `PLACEHOLDER` const and add the new imports:

Old imports to remove/replace:
```typescript
import { youtubeThumbUrl } from '@/helpers/youtube';
// and the line:
const PLACEHOLDER = require('@/assets/images/splash-icon.png');
// and the line:
const thumbUrl = exercise.youtube_url ? youtubeThumbUrl(exercise.youtube_url) : null;
```

Add this import alongside existing imports:
```typescript
import { ExerciseVideoHero } from '@/components/exercise-video-hero';
```

- [ ] **Step 2: Restructure the SafeAreaView layout**

The current structure is:
```
<SafeAreaView>
  <ScrollView>
    <Pressable videoHero>...</Pressable>   ← hero
    <Pressable backBtn>...</Pressable>     ← back button (WRONG: inside scroll)
    ... rest of content
  </ScrollView>
</SafeAreaView>
```

Change it to:
```typescript
return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Back button — fixed, outside scroll */}
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <View style={styles.backCircle}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
            </View>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* ── Video Hero ── */}
            <ExerciseVideoHero
                videoStoragePath={exercise.video_storage_path}
                youtubeUrl={exercise.youtube_url}
                thumbnailStoragePath={exercise.thumbnail_storage_path}
                exerciseId={id}
            />

            {/* ── Title + Category + Level ── */}
            {/* ... rest unchanged ... */}
        </ScrollView>
    </SafeAreaView>
);
```

Also remove the old `videoHero`-related styles (`videoHero`, `playButton`) from `StyleSheet.create` since they now live in `ExerciseVideoHero`. Keep `backBtn` and `backCircle` styles as-is — they're still used.

Also remove the `Watch video CTA` block (lines 172–190 in the original) — it duplicates the play functionality now handled by the hero. The hero already opens the YouTube URL when tapped in the static fallback case.

- [ ] **Step 3: Commit**

```bash
git add app/exercise/[id].tsx
git commit -m "feat: use ExerciseVideoHero and fix back button in exercise detail"
```

---

## Task 6: Update session/[id].tsx thumbnail

**Files:**
- Modify: `app/session/[id].tsx`

`thumbnail_storage_path` is already fetched in `use-session-detail-query.ts`. Just swap the static `PLACEHOLDER_THUMB` for the real URL with fallback.

- [ ] **Step 1: Add the import**

Add to imports at the top of `app/session/[id].tsx`:
```typescript
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
```

Remove the `PLACEHOLDER_THUMB` const (line 24).

- [ ] **Step 2: Replace the Image source in the exercise row**

Find the `<Image>` inside the `thumbWrap` view (around line 158):

Old:
```typescript
<Image
    source={PLACEHOLDER_THUMB}
    style={styles.thumb}
    contentFit="cover"
/>
```

New:
```typescript
<Image
    source={
        ex.exercise.thumbnail_storage_path
            ? { uri: exerciseThumbnailUrl(ex.exercise.thumbnail_storage_path)! }
            : require('@/assets/images/splash-icon.png')
    }
    style={styles.thumb}
    contentFit="cover"
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/session/[id].tsx
git commit -m "feat: load exercise thumbnails from storage in session detail"
```

---

## Task 7: Update active-session/[id].tsx thumbnail

**Files:**
- Modify: `app/active-session/[id].tsx`

`thumbnail_storage_path` is already available (fetched via the shared `useSessionDetailQuery`). Currently the screen derives `thumbUrl` from YouTube only. Extend it to check the storage path first.

- [ ] **Step 1: Add the import**

Add to imports at the top of `app/active-session/[id].tsx`:
```typescript
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
```

- [ ] **Step 2: Update thumbUrl derivation**

Find (around line 314):
```typescript
const thumbUrl = current.exercise.youtube_url
    ? youtubeThumbUrl(current.exercise.youtube_url)
    : null;
```

Replace with:
```typescript
const thumbUrl =
    exerciseThumbnailUrl(current.exercise.thumbnail_storage_path) ??
    (current.exercise.youtube_url ? youtubeThumbUrl(current.exercise.youtube_url) : null);
```

The `Image` source (around line 364) already handles the null case with `PLACEHOLDER` — no change needed there.

- [ ] **Step 3: Commit**

```bash
git add app/active-session/[id].tsx
git commit -m "feat: prefer storage thumbnail over YouTube in active session"
```
