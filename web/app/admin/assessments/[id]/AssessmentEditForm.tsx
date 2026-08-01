'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAssessmentVideoUploadUrl,
  updateAssessment,
  updateAssessmentVideo,
  type AssessmentWithRelations,
} from '../../../actions/assessments'
import { asI18n } from '@/lib/i18n'
import { DropZone } from '../../_components/DropZone'
import type { SportCategory } from '../../../actions/sport-categories'
import type { Metric } from '../../../actions/metrics'
import type { Equipment } from '../../../actions/equipment'

type Props = {
  assessment: AssessmentWithRelations
  categories: SportCategory[]
  metrics: Metric[]
  equipments: Equipment[]
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(s)
}

export function AssessmentEditForm({ assessment: initial, categories, metrics, equipments }: Props) {
  const [slug, setSlug] = useState(initial.slug)
  const [slugError, setSlugError] = useState('')
  const [name, setName] = useState(initial.name ?? '')
  const [nameEn, setNameEn] = useState(asI18n(initial.name_i18n).en)
  const [nameDe, setNameDe] = useState(asI18n(initial.name_i18n).de)
  const [descEn, setDescEn] = useState(asI18n(initial.description_i18n).en)
  const [descDe, setDescDe] = useState(asI18n(initial.description_i18n).de)
  const [categoryId, setCategoryId] = useState(initial.category_id ?? '')
  const [metricId, setMetricId] = useState(initial.measured_metric_id ?? '')
  const [minLevel, setMinLevel] = useState(String(initial.min_level ?? ''))
  const [maxLevel, setMaxLevel] = useState(String(initial.max_level ?? ''))
  const [equipmentIds, setEquipmentIds] = useState<string[]>(initial.equipmentIds.filter((id): id is string => id !== null))
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '')
  const [videoPath, setVideoPath] = useState(initial.video_storage_path)
  const [pendingVideo, setPendingVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState('')
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const storageBase = `${supabaseUrl}/storage/v1/object/public/assessments`

  const selectVideo = (file: File) => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setPendingVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    setVideoStatus('')
  }

  const cancelVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setPendingVideo(null)
    setVideoPreview(null)
    setVideoStatus('')
  }

  const saveVideo = async () => {
    if (!pendingVideo) return
    setVideoStatus('Uploading...')
    try {
      const { signedUrl, path } = await getAssessmentVideoUploadUrl(initial.id)
      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: pendingVideo,
        headers: { 'Content-Type': pendingVideo.type },
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      await updateAssessmentVideo(initial.id, path)
      setVideoPath(path)
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      setPendingVideo(null)
      setVideoPreview(null)
      setVideoStatus('Saved ✓')
      router.refresh()
    } catch (err) {
      setVideoStatus(err instanceof Error ? err.message : 'Error uploading')
    }
  }

  const save = () => {
    if (!isValidSlug(slug)) {
      setSlugError('Nur Kleinbuchstaben und Unterstriche erlaubt')
      return
    }
    setSlugError('')
    startTransition(async () => {
      try {
        await updateAssessment(initial.id, {
          slug,
          name,
          name_i18n: { en: nameEn, de: nameDe },
          description_i18n: { en: descEn, de: descDe },
          category_id: categoryId,
          measured_metric_id: metricId,
          min_level: minLevel ? Number(minLevel) : 0,
          max_level: maxLevel ? Number(maxLevel) : 100,
          youtube_url: youtubeUrl.trim() || null,
          equipmentIds,
        })
        setStatus('Saved ✓')
        router.refresh()
      } catch {
        setStatus('Fehler beim Speichern')
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Basics</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugError('') }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 font-mono"
            />
            {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (intern)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (Deutsch)</label>
            <input
              type="text"
              value={nameDe}
              onChange={e => setNameDe(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name (Englisch)</label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Beschreibung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Deutsch</label>
            <textarea
              value={descDe}
              onChange={e => setDescDe(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Englisch</label>
            <textarea
              value={descEn}
              onChange={e => setDescEn(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Klassifizierung</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {asI18n(cat.name_i18n).de || cat.slug}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gemessene Metrik</label>
            <select
              value={metricId}
              onChange={e => setMetricId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">— keine —</option>
              {metrics.map(m => (
                <option key={m.id} value={m.id}>
                  {asI18n(m.name_i18n).de || m.slug} ({m.unit})
                </option>
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
      </section>

      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Equipment</h3>
        <div className="grid grid-cols-2 gap-2">
          {equipments.map(eq => (
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
              <span className="text-gray-300">{asI18n(eq.name_i18n).de || eq.slug}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="bg-gray-900 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Video</h3>
        <p className="text-xs text-gray-500 mb-4">
          Hochgeladenes Video hat in der App Vorrang vor der YouTube-URL.
        </p>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">YouTube URL</label>
          <input
            type="text"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <p className="text-xs text-gray-600 mt-1">Wird mit dem Speichern-Button unten gesichert.</p>
        </div>

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
                Video hochladen
              </button>
              <button
                onClick={cancelVideo}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {videoPath && supabaseUrl && (
              <video
                src={`${storageBase}/${videoPath}`}
                controls
                className="w-full aspect-video rounded border border-gray-700 bg-black"
              />
            )}
            <DropZone
              accept="video/mp4,video/*"
              aspect="landscape"
              label="Video hier ablegen"
              onFile={selectVideo}
            />
          </div>
        )}

        {videoStatus && <p className="text-xs text-gray-400 mt-2">{videoStatus}</p>}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Speichern
        </button>
        {status && <p className="text-xs text-gray-400">{status}</p>}
      </div>
    </div>
  )
}
