import { getSportGroups, getSports } from '../../actions/sports'
import { SportBannerGrid } from './SportBannerGrid'

export default async function SportsPage() {
  const [sports, groups] = await Promise.all([getSports(), getSportGroups()])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          {sports.length} Sportarten, {groups.length} Gruppen — Banner-Bilder für den Profil-Header
        </p>
      </div>
      <SportBannerGrid sports={sports} groups={groups} />
    </div>
  )
}
