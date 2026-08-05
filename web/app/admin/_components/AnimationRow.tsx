'use client'

import type { AnimationItem } from 'lottie-web'
import { useEffect, useRef, useState } from 'react'

/** Small looping preview of a Lottie JSON, loaded client-side only. */
function LottiePreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let anim: AnimationItem | undefined

    async function load() {
      try {
        const [mod, res] = await Promise.all([import('lottie-web'), fetch(url)])
        const animationData = await res.json()
        if (cancelled || !containerRef.current) return
        anim = mod.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        })
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    load()

    return () => {
      cancelled = true
      anim?.destroy()
    }
  }, [url])

  if (failed) {
    return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-900 text-[10px] text-red-400">✕</span>
  }
  return <div ref={containerRef} className="h-10 w-10 shrink-0 rounded bg-gray-900" />
}

/** Compact upload row for a training-day Lottie animation (JSON), shown below a BannerCard. */
export function AnimationRow({
  animationUrl,
  onUpload,
  onRemove,
}: {
  animationUrl: string | null
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

  async function handleFile(file: File) {
    // Lottie sanity check: valid JSON with a layers array
    try {
      const json = JSON.parse(await file.text())
      if (!Array.isArray(json.layers)) throw new Error()
    } catch {
      setStatus('Keine gültige Lottie-Datei')
      return
    }
    run(() => onUpload(file), 'Uploading…', 'Saved ✓')
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        if (busy) return
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      className={`flex items-center justify-between rounded-lg border bg-gray-950 px-3 py-2 mt-1 transition-colors ${dragging ? 'border-white' : 'border-gray-800'}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {animationUrl ? (
          <LottiePreview key={animationUrl} url={animationUrl} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-gray-700" />
        )}
        <span className="text-xs text-gray-400 truncate">
          {dragging ? 'Loslassen zum Hochladen' : `Lottie-Animation${busy || status ? ` — ${status}` : animationUrl ? '' : ' — keine'}`}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {animationUrl ? 'Ersetzen' : 'Hochladen'}
        </button>
        {animationUrl && (
          <button
            onClick={() => run(onRemove, 'Removing…', null)}
            disabled={busy}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Entfernen
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
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
