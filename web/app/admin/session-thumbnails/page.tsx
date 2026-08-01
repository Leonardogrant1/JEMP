import { getSessionThumbnails } from '../../actions/session-thumbnails'
import { SessionThumbnailGrid } from './SessionThumbnailGrid'

export default async function SessionThumbnailsPage() {
  const thumbnails = await getSessionThumbnails()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          {thumbnails.length} Bild-Gruppen — Thumbnails für Session-Cards in der App.
          Ohne Bild nutzt die App das eingebaute Stock-Foto der Gruppe.
        </p>
      </div>
      <SessionThumbnailGrid thumbnails={thumbnails} />
    </div>
  )
}
