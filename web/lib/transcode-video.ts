import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from 'mediabunny'

// Supabase-Storage lehnt Objekte über 50 MB ab (fileSizeLimit auf Staging UND
// Prod) — lokal gingen iPhone-Rohexporte (HEVC 1440×2560, 50–103 MB) rein und
// scheiterten erst beim exercises:push. Deshalb fail-closed: was dieses Limit
// reißt und nicht transkodiert werden kann, wird gar nicht erst hochgeladen.
const REMOTE_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024
// Ab hier wird transkodiert (nicht erst am 50-MB-Limit): >30 MB für einen
// ~60s-Übungsclip heißt praktisch immer unkomprimierter Kamera-Export, und
// die App streamt die Videos über Mobilfunk.
const TRANSCODE_SIZE_BYTES = 30 * 1024 * 1024
const MAX_SHORT_SIDE = 1080
// Entspricht der manuellen ffmpeg-Runde (CRF 26 ≈ 2–3 Mbit/s bei 1080×1920):
// aus 100-MB-Exports wurden ~10 MB ohne sichtbaren Unterschied auf dem Handy.
const VIDEO_BITRATE = 2_500_000

/**
 * Transkodiert ein Übungsvideo clientseitig (WebCodecs via mediabunny) auf
 * max. 1080p-Kurzseite H.264/MP4, bevor es in den Storage geht. Kleine, schon
 * kompakte Dateien gehen unverändert durch.
 */
export async function prepareVideoForUpload(
  file: File,
  onProgress: (percent: number) => void
): Promise<File> {
  try {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
    const videoTrack = await input.getPrimaryVideoTrack()
    if (!videoTrack) throw new Error('Datei enthält keine Videospur')

    const codedWidth = await videoTrack.getDisplayWidth()
    const codedHeight = await videoTrack.getDisplayHeight()
    const rotation = await videoTrack.getRotation()
    // Sichtbare Ausrichtung: iPhone-Clips tragen die Drehung oft nur als
    // Metadatum, die kodierten Maße sind dann quer.
    const [visualWidth, visualHeight] =
      rotation % 180 === 0 ? [codedWidth, codedHeight] : [codedHeight, codedWidth]
    const shortSide = Math.min(visualWidth, visualHeight)

    if (file.size <= TRANSCODE_SIZE_BYTES && shortSide <= MAX_SHORT_SIDE) return file

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    })
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: 'avc',
        quality: new Quality({ bitrate: VIDEO_BITRATE }),
        // Nur eine Achse setzen — mediabunny hält das Seitenverhältnis; die
        // Maße gelten post-Rotation, daher die visuellen Werte.
        ...(visualHeight >= visualWidth
          ? { width: Math.min(MAX_SHORT_SIDE, visualWidth) }
          : { height: Math.min(MAX_SHORT_SIDE, visualHeight) }),
      },
    })
    // Nicht nur isValid prüfen: kann z.B. die HEVC-Spur nicht dekodiert
    // werden, bleibt die Conversion über die Audiospur "valid" und würde
    // stillschweigend ein Audio-only-MP4 liefern (im Node-Smoke-Test so
    // passiert). Jede verworfene Spur ist deshalb ein Abbruch.
    if (!conversion.isValid || conversion.discardedTracks.length > 0) {
      const reasons = conversion.discardedTracks.map((t) => t.reason).join(', ')
      throw new Error(`Transcode nicht möglich (${reasons || 'unbekannt'})`)
    }
    conversion.onProgress = (p) => onProgress(Math.round(p * 100))
    await conversion.execute()

    const buffer = output.target.buffer
    if (!buffer) throw new Error('Transcode lieferte keine Daten')
    return new File([buffer], file.name.replace(/\.\w+$/, '') + '.mp4', { type: 'video/mp4' })
  } catch (err) {
    // Fail-closed nur dort, wo es wehtut: Ein Original unter dem Remote-Limit
    // darf trotz Transcode-Fehler (alter Browser, exotischer Codec) hoch.
    if (file.size <= REMOTE_UPLOAD_LIMIT_BYTES) return file
    const mb = Math.round(file.size / 1024 / 1024)
    throw new Error(
      `Video ist ${mb} MB (Limit 50 MB) und konnte nicht komprimiert werden: ${
        err instanceof Error ? err.message : 'unbekannter Fehler'
      }`
    )
  }
}
