import Link from 'next/link'
import { getExercises, getExerciseRelations } from '../actions/exercises'
import { ExerciseCategoryFilter } from './_components/ExerciseCategoryFilter'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const [exercises, relations] = await Promise.all([
    getExercises(category),
    getExerciseRelations(),
  ])

  const withYoutube = exercises.filter(e => e.youtube_url).length
  const withThumbnail = exercises.filter(e => e.thumbnail_storage_path).length
  const withVideo = exercises.filter(e => e.video_storage_path).length
  const withImageGroup = exercises.filter(e => e.image_group).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {exercises.length} exercises — {withYoutube} with YouTube, {withThumbnail} with thumbnail, {withVideo} with video, {withImageGroup}/{exercises.length} with image group
        </p>
        <Link
          href="/admin/exercises/new"
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
        >
          + Neue Übung
        </Link>
      </div>
      <div className="mb-4">
        <ExerciseCategoryFilter categories={relations.categories as any} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Name</th>
            <th className="pb-3 pr-6 font-medium">Slug</th>
            <th className="pb-3 pr-6 font-medium">Category</th>
            <th className="pb-3 pr-4 font-medium">Image Group</th>
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
              <td className="py-3 pr-6 text-gray-400 text-xs">
                {exercise.category?.slug ?? <span className="text-red-500">—</span>}
              </td>
              <td className="py-3 pr-4">
                {exercise.image_group
                  ? <span className="text-xs font-mono text-green-400">{exercise.image_group}</span>
                  : <span className="text-red-500">✗</span>
                }
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
