'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { frameCropDrawParams } from '@/lib/crop-frame'

// Frame aus dem Übungsvideo als Thumbnail: scrubben → Frame einfrieren →
// 1:1 croppen (Profilbild-Pattern) → 1024er JPEG in die bestehende
// selectThumbnail-Pipeline. Zwei Schritte, weil der Cropper auf einem
// eingefrorenen Standbild arbeitet — so bleibt die Auswahl beim Zoomen stabil.
export function VideoFramePicker({
  videoUrl,
  onSelect,
  onClose,
}: {
  videoUrl: string
  onSelect: (file: File) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [frameSrc, setFrameSrc] = useState<string | null>(null)
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [error, setError] = useState('')

  const seek = (t: number) => {
    setTime(t)
    if (videoRef.current) videoRef.current.currentTime = t
  }

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      setFrameSize({ w: video.videoWidth, h: video.videoHeight })
      setFrameSrc(canvas.toDataURL('image/jpeg', 0.95))
      setError('')
    } catch {
      // Canvas tainted → Storage-CORS greift nicht (sollte mit crossOrigin nie passieren)
      setError('Frame konnte nicht gelesen werden (CORS) — Video neu laden und erneut versuchen.')
    }
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  const confirm = () => {
    if (!frameSrc || !frameSize || !croppedArea) return
    const img = new Image()
    img.onload = () => {
      const { sx, sy, sWidth, sHeight, dSize } = frameCropDrawParams(croppedArea, frameSize.w, frameSize.h)
      const canvas = document.createElement('canvas')
      canvas.width = dSize
      canvas.height = dSize
      canvas.getContext('2d')!.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dSize, dSize)
      canvas.toBlob(
        blob => {
          if (!blob) { setError('Export fehlgeschlagen.'); return }
          onSelect(new File([blob], 'video-frame.jpg', { type: 'image/jpeg' }))
          onClose()
        },
        'image/jpeg',
        0.9,
      )
    }
    img.src = frameSrc
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {frameSrc ? 'Ausschnitt wählen (1:1)' : 'Frame wählen'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        {!frameSrc ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              className="w-full aspect-video rounded border border-gray-700 bg-black"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => seek(Math.max(0, time - 1 / 30))} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700">‹</button>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1 / 30}
                value={time}
                onChange={e => seek(Number(e.target.value))}
                className="flex-1"
              />
              <button onClick={() => seek(Math.min(duration, time + 1 / 30))} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700">›</button>
              <span className="text-xs text-gray-500 w-12 text-right">{time.toFixed(2)}s</span>
            </div>
            <button
              onClick={captureFrame}
              className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
            >
              Diesen Frame verwenden
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded overflow-hidden border border-gray-700 bg-black">
              <Cropper
                image={frameSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirm}
                className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
              >
                Als Thumbnail übernehmen
              </button>
              <button
                onClick={() => setFrameSrc(null)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                ← Anderen Frame wählen
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
