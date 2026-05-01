'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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

export function ExerciseEditForm({ exercise: initial }: Props) {
  const [exercise, setExercise] = useState(initial)
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '')
  const [statuses, setStatuses] = useState<Statuses>({})
  const [isPending, startTransition] = useTransition()

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
    </div>
  )
}
