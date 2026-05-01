import Link from 'next/link'
import { getExercises } from '../actions/exercises'

export default async function AdminPage() {
  const exercises = await getExercises()

  const withYoutube = exercises.filter(e => e.youtube_url).length
  const withThumbnail = exercises.filter(e => e.thumbnail_storage_path).length
  const withVideo = exercises.filter(e => e.video_storage_path).length

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        {exercises.length} exercises — {withYoutube} with YouTube, {withThumbnail} with thumbnail, {withVideo} with video
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Name</th>
            <th className="pb-3 pr-6 font-medium">Slug</th>
            <th className="pb-3 pr-4 font-medium">YouTube</th>
            <th className="pb-3 pr-4 font-medium">Thumbnail</th>
            <th className="pb-3 font-medium">Video</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map(exercise => (
            <tr
              key={exercise.id}
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors"
            >
              <td className="py-3 pr-6">
                <Link
                  href={`/admin/${exercise.id}`}
                  className="hover:underline"
                >
                  {exercise.name}
                </Link>
              </td>
              <td className="py-3 pr-6 text-gray-400 font-mono text-xs">
                {exercise.slug}
              </td>
              <td className="py-3 pr-4">
                <span className={exercise.youtube_url ? 'text-green-400' : 'text-red-500'}>
                  {exercise.youtube_url ? '✓' : '✗'}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={exercise.thumbnail_storage_path ? 'text-green-400' : 'text-red-500'}>
                  {exercise.thumbnail_storage_path ? '✓' : '✗'}
                </span>
              </td>
              <td className="py-3">
                <span className={exercise.video_storage_path ? 'text-green-400' : 'text-red-500'}>
                  {exercise.video_storage_path ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
