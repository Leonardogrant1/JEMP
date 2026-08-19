'use client'

import { useRef, useState } from 'react'

export function DropZone({
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
