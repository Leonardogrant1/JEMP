'use client'

import { useRouter } from 'next/navigation'
import {
  getSportBannerUploadUrl,
  getSportGroupBannerUploadUrl,
  updateSportBanner,
  updateSportGroupBanner,
  type Sport,
  type SportGroup,
} from '../../actions/sports'
import { asI18n } from '@/lib/i18n'
import { BannerCard, uploadViaSignedUrl } from '../_components/BannerCard'

function bannerPublicUrl(path: string | null): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sport-banners/${path}`
}

export function SportBannerGrid({ sports, groups }: { sports: Sport[]; groups: SportGroup[] }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-sm font-medium text-gray-300 mb-3">
          Gruppen-Banner
          <span className="ml-2 font-normal text-gray-500">Fallback, wenn die Sportart kein eigenes Banner hat</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map(group => (
            <BannerCard
              key={group.group_name}
              title={group.group_name}
              subtitle="Gruppe"
              imageUrl={bannerPublicUrl(group.banner_storage_path)}
              onUpload={async file => {
                const { signedUrl, path } = await getSportGroupBannerUploadUrl(group.group_name, file.type)
                await uploadViaSignedUrl(signedUrl, file)
                await updateSportGroupBanner(group.group_name, path)
                router.refresh()
              }}
              onRemove={async () => {
                await updateSportGroupBanner(group.group_name, null)
                router.refresh()
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-300 mb-3">Sportarten-Banner</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sports.map(sport => (
            <BannerCard
              key={sport.id}
              title={asI18n(sport.name_i18n).de || sport.slug}
              subtitle={sport.slug}
              imageUrl={bannerPublicUrl(sport.banner_storage_path)}
              onUpload={async file => {
                const { signedUrl, path } = await getSportBannerUploadUrl(sport.id, file.type)
                await uploadViaSignedUrl(signedUrl, file)
                await updateSportBanner(sport.id, path)
                router.refresh()
              }}
              onRemove={async () => {
                await updateSportBanner(sport.id, null)
                router.refresh()
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
