'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSignedUploadUrl,
  updateExercise,
  deleteExercise,
  type Exercise,
} from '../../actions/exercises'

type Props = {
  exercise: Exercise & { equipmentIds: string[]; environmentIds: string[] }
  relations: {
    categories: { id: string; slug: string; name_i18n: { en: string; de: string } | null }[]
    equipments: { id: string; slug: string; name_i18n: { en: string; de: string } | null }[]
    environments: { id: string; slug: string; name_i18n: { en: string; de: string } | null }[]
  }
}

type Statuses = {
  basics?: string
  description?: string
  classification?: string
  equipment?: string
  environments?: string
  youtube?: string
  thumbnail?: string
  video?: string
}

function DropZone({
  accept,
  onFile,
  label,
  aspect,
}: {
  accept: string
  onFile: (file: File) => void
  label: string
  aspect: 'square' | 'landscape'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const aspectClass = aspect === 'square' ? 'aspect-square w-32' : 'aspect-video w-full'

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${aspectClass} ${
        dragging
          ? 'border-white bg-gray-800'
          : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xs text-gray-600 mt-1">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)
}

export function ExerciseEditForm({ exercise: initial, relations }: Props) {
  const [exercise, setExercise] = useState(initial)
  const [statuses, setStatuses] = useState<Statuses>({})
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Danger zone
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('')
  const [isDeleting, startDeleteTransition] = useTransition()

  // Basics
  const [name, setName] = useState(initial.name ?? '')
  const [slug, setSlug] = useState(initial.slug ?? '')
  const [slugError, setSlugError] = useState('')
  const [categoryId, setCategoryId] = useState(initial.category_id ?? '')

  // Description
  const [descEn, setDescEn] = useState(initial.description_i18n?.en ?? '')
  const [descDe, setDescDe] = useState(initial.description_i18n?.de ?? '')

  // Classification
  const [movementPattern, setMovementPattern] = useState(initial.movement_pattern ?? '')
  const [bodyRegion, setBodyRegion] = useState(initial.body_region ?? '')
  const [minLevel, setMinLevel] = useState(String(initial.min_level ?? ''))
  const [maxLevel, setMaxLevel] = useState(String(initial.max_level ?? ''))

  // Relations
  const [equipmentIds, setEquipmentIds] = useState<string[]>(initial.equipmentIds)
  const [environmentIds, setEnvironmentIds] = useState<string[]>(initial.environmentIds)

  // YouTube / media
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '')

  const [pendingThumbnail, setPendingThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const [pendingVideo, setPendingVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = (field: keyof Statuses, msg: string) =>
    setStatuses(s => ({ ...s, [field]: msg }))

  const saveBasics = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Bindestriche erlaubt (z.B. back-squat)')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, {
          name,
          slug,
          category_id: categoryId || null,
        })
        setStatus('basics', 'Saved ✓')
      } catch {
        setStatus('basics', 'Error saving')
      }
    })
  }

  const saveDescription = () => {
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, { description_i18n: { en: descEn, de: descDe } })
        setStatus('description', 'Saved ✓')
      } catch {
        setStatus('description', 'Error saving')
      }
    })
  }

  const saveClassification = () => {
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, {
          movement_pattern: movementPattern || null,
          body_region: bodyRegion || null,
          min_level: minLevel ? Number(minLevel) : null,
          max_level: maxLevel ? Number(maxLevel) : null,
        })
        setStatus('classification', 'Saved ✓')
      } catch {
        setStatus('classification', 'Error saving')
      }
    })
  }

  const saveEquipment = () => {
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, { equipmentIds })
        setStatus('equipment', 'Saved ✓')
      } catch {
        setStatus('equipment', 'Error saving')
      }
    })
  }

  const saveEnvironments = () => {
    startTransition(async () => {
      try {
        await updateExercise(exercise.id, { environmentIds })
        setStatus('environments', 'Saved ✓')
      } catch {
        setStatus('environments', 'Error saving')
      }
    })
  }

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

  const selectThumbnail = (file: File) => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setPendingThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setStatus('thumbnail', '')
  }

  const cancelThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setPendingThumbnail(null)
    setThumbnailPreview(null)
    setStatus('thumbnail', '')
  }

  const saveThumbnail = async () => {
    if (!pendingThumbnail) return
    setStatus('thumbnail', 'Uploading...')
    try {
      const { signedUrl, path } = await getSignedUploadUrl(exercise.id, 'thumbnail')
      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: pendingThumbnail,
        headers: { 'Content-Type': pendingThumbnail.type },
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      await updateExercise(exercise.id, { thumbnail_storage_path: path })
      setExercise(e => ({ ...e, thumbnail_storage_path: path }))
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
      setPendingThumbnail(null)
      setThumbnailPreview(null)
      setStatus('thumbnail', 'Saved ✓')
    } catch (err) {
      setStatus('thumbnail', err instanceof Error ? err.message : 'Error uploading')
    }
  }

  const selectVideo = (file: File) => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setPendingVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    setStatus('video', '')
  }

  const cancelVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setPendingVideo(null)
    setVideoPreview(null)
    setStatus('video', '')
  }

  const saveVideo = async () => {
    if (!pendingVideo) return
    setStatus('video', 'Uploading...')
    try {
      const { signedUrl, path } = await getSignedUploadUrl(exercise.id, 'video')
      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: pendingVideo,
        headers: { 'Content-Type': pendingVideo.type },
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      await updateExercise(exercise.id, { video_storage_path: path })
      setExercise(e => ({ ...e, video_storage_path: path }))
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      setPendingVideo(null)
      setVideoPreview(null)
      setStatus('video', 'Saved ✓')
    } catch (err) {
      setStatus('video', err instanceof Error ? err.message : 'Error uploading')
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const storageBase = `${supabaseUrl}/storage/v1/object/public/exercises`

  return (
    <div className="space-y-6">
      {/* Basics */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Basics</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugError('') }}
              placeholder="z.B. back-squat"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 font-mono"
            />
            {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {relations.categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_i18n?.de ?? cat.slug}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveBasics} disabled={isPending} className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Save
          </button>
          {statuses.basics && <p className="text-xs text-gray-400">{statuses.basics}</p>}
        </div>
      </section>

      {/* Beschreibung */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Beschreibung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Englisch</label>
            <textarea
              value={descEn}
              onChange={e => setDescEn(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Deutsch</label>
            <textarea
              value={descDe}
              onChange={e => setDescDe(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveDescription} disabled={isPending} className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Save
          </button>
          {statuses.description && <p className="text-xs text-gray-400">{statuses.description}</p>}
        </div>
      </section>

      {/* Klassifizierung */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Klassifizierung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Movement Pattern</label>
            <select
              value={movementPattern}
              onChange={e => setMovementPattern(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {['push','pull','legs','core','isometric','plyometric','mobility','cardio','other'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Body Region</label>
            <select
              value={bodyRegion}
              onChange={e => setBodyRegion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {['ankle','calf','knee','quad','hamstring','glute','hip','groin','lower_back','core','obliques','thoracic','upper_back','chest','shoulder','bicep','tricep','forearm','full_body','neck'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Min Level (1–100)</label>
              <input
                type="number"
                min={1} max={100}
                value={minLevel}
                onChange={e => setMinLevel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Max Level (1–100)</label>
              <input
                type="number"
                min={1} max={100}
                value={maxLevel}
                onChange={e => setMaxLevel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveClassification} disabled={isPending} className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Save
          </button>
          {statuses.classification && <p className="text-xs text-gray-400">{statuses.classification}</p>}
        </div>
      </section>

      {/* Equipment */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Equipment</h3>
        <div className="grid grid-cols-2 gap-2">
          {relations.equipments.map(eq => (
            <label key={eq.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={equipmentIds.includes(eq.id)}
                onChange={e => {
                  setEquipmentIds(prev =>
                    e.target.checked ? [...prev, eq.id] : prev.filter(id => id !== eq.id)
                  )
                }}
                className="rounded border-gray-600 bg-gray-800"
              />
              <span className="text-gray-300">{eq.name_i18n?.de ?? eq.slug}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveEquipment} disabled={isPending} className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Save
          </button>
          {statuses.equipment && <p className="text-xs text-gray-400">{statuses.equipment}</p>}
        </div>
      </section>

      {/* Environments */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Environments</h3>
        <div className="flex gap-4">
          {relations.environments.map(env => (
            <label key={env.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={environmentIds.includes(env.id)}
                onChange={e => {
                  setEnvironmentIds(prev =>
                    e.target.checked ? [...prev, env.id] : prev.filter(id => id !== env.id)
                  )
                }}
                className="rounded border-gray-600 bg-gray-800"
              />
              <span className="text-gray-300">{env.name_i18n?.de ?? env.slug}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveEnvironments} disabled={isPending} className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Save
          </button>
          {statuses.environments && <p className="text-xs text-gray-400">{statuses.environments}</p>}
        </div>
      </section>

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

        {pendingThumbnail ? (
          <div className="space-y-3">
            <img
              src={thumbnailPreview!}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border border-gray-700"
            />
            <div className="flex gap-2">
              <button
                onClick={saveThumbnail}
                className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
              >
                Save
              </button>
              <button
                onClick={cancelThumbnail}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {exercise.thumbnail_storage_path && supabaseUrl && (
              <img
                src={`${storageBase}/${exercise.thumbnail_storage_path}`}
                alt="Current thumbnail"
                className="w-32 h-32 object-cover rounded border border-gray-700"
              />
            )}
            <DropZone
              accept="image/*"
              aspect="square"
              label="Drop thumbnail here"
              onFile={selectThumbnail}
            />
          </div>
        )}

        {statuses.thumbnail && (
          <p className="text-xs text-gray-400 mt-2">{statuses.thumbnail}</p>
        )}
      </section>

      {/* Video */}
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Video
        </h3>

        {pendingVideo ? (
          <div className="space-y-3">
            <video
              src={videoPreview!}
              controls
              className="w-full aspect-video rounded border border-gray-700 bg-black"
            />
            <div className="flex gap-2">
              <button
                onClick={saveVideo}
                className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
              >
                Save
              </button>
              <button
                onClick={cancelVideo}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {exercise.video_storage_path && supabaseUrl && (
              <video
                src={`${storageBase}/${exercise.video_storage_path}`}
                controls
                className="w-full aspect-video rounded border border-gray-700 bg-black"
              />
            )}
            <DropZone
              accept="video/mp4,video/*"
              aspect="landscape"
              label="Drop video here"
              onFile={selectVideo}
            />
          </div>
        )}

        {statuses.video && (
          <p className="text-xs text-gray-400 mt-2">{statuses.video}</p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="border border-red-900 rounded-lg p-5 mt-4">
        <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">
          Danger Zone
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Diese Aktion ist nicht umkehrbar. Die Übung wird samt aller verknüpften Session-Daten (absolvierte Sets, Trainingshistorie) und Plan-Blöcke gelöscht. Tippe den Slug der Übung ein um das Löschen zu bestätigen.
        </p>
        <p className="text-xs text-gray-400 mb-2">
          Slug: <span className="font-mono text-gray-300">{exercise.slug}</span>
        </p>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={deleteConfirmSlug}
            onChange={e => { setDeleteConfirmSlug(e.target.value); setDeleteStatus('') }}
            placeholder={exercise.slug}
            className="bg-gray-800 border border-red-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-700 font-mono w-64"
          />
          <button
            disabled={deleteConfirmSlug !== exercise.slug || isDeleting}
            onClick={() => {
              if (deleteConfirmSlug !== exercise.slug) return
              startDeleteTransition(async () => {
                try {
                  await deleteExercise(exercise.id)
                  router.push('/admin')
                } catch {
                  setDeleteStatus('Fehler beim Löschen')
                }
              })
            }}
            className="px-4 py-2 bg-red-700 text-white rounded text-sm font-medium hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Löschen...' : 'Übung löschen'}
          </button>
        </div>
        {deleteStatus && <p className="text-xs text-red-400 mt-2">{deleteStatus}</p>}
      </section>
    </div>
  )
}
