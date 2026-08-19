'use client'

import { useRouter } from 'next/navigation'
import {
  getSessionThumbnailUploadUrl,
  updateSessionThumbnail,
  type SessionThumbnail,
} from '../../actions/session-thumbnails'
import { BannerCard, uploadViaSignedUrl } from '../_components/BannerCard'

function thumbnailPublicUrl(path: string | null): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/session-thumbnails/${path}`
}

export function SessionThumbnailGrid({ thumbnails }: { thumbnails: SessionThumbnail[] }) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {thumbnails.map(thumb => (
        <BannerCard
          key={thumb.image_group}
          title={thumb.image_group}
          subtitle="Bild-Gruppe"
          imageUrl={thumbnailPublicUrl(thumb.storage_path)}
          onUpload={async file => {
            const { signedUrl, path } = await getSessionThumbnailUploadUrl(thumb.image_group, file.type)
            await uploadViaSignedUrl(signedUrl, file)
            await updateSessionThumbnail(thumb.image_group, path)
            router.refresh()
          }}
          onRemove={async () => {
            await updateSessionThumbnail(thumb.image_group, null)
            router.refresh()
          }}
        />
      ))}
    </div>
  )
}
