'use client'

import { useRef, useState } from 'react'

export async function uploadViaSignedUrl(signedUrl: string, file: File) {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
}

/** Image card with click-to-browse and drag & drop upload, plus remove. */
export function BannerCard({
  title,
  subtitle,
  imageUrl,
  onUpload,
  onRemove,
}: {
  title: string
  subtitle: string
  imageUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function run(action: () => Promise<void>, pendingLabel: string, doneLabel: string | null) {
    setBusy(true)
    setStatus(pendingLabel)
    try {
      await action()
      setStatus(doneLabel)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setStatus('Nur Bilder erlaubt')
      return
    }
    run(() => onUpload(file), 'Uploading…', 'Saved ✓')
  }

  return (
    <div className={`rounded-lg border overflow-hidden bg-gray-950 transition-colors ${dragging ? 'border-white' : 'border-gray-800'}`}>
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          if (busy) return
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        disabled={busy}
        className="relative block w-full aspect-video bg-gray-900 group"
        title="Bild hochladen oder hierher ziehen"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
            Kein Bild
          </span>
        )}
        <span className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity text-xs text-white ${dragging || busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {busy ? status : dragging ? 'Loslassen zum Hochladen' : 'Bild hochladen oder hierher ziehen'}
        </span>
      </button>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm truncate">{title}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status && !busy && <span className="text-xs text-gray-400">{status}</span>}
          {imageUrl && (
            <button
              onClick={() => run(onRemove, 'Removing…', null)}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Entfernen
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
