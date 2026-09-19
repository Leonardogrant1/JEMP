import Link from 'next/link'
import { getExercise, getExerciseRelations, getExercises } from '../../actions/exercises'
import { ExerciseEditForm } from './ExerciseEditForm'

// In Next.js 15+, params is a Promise
export default async function ExerciseEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [exercise, relations, allExercises] = await Promise.all([
    getExercise(id),
    getExerciseRelations(),
    getExercises(),
  ])
  const thumbnailSources = allExercises
    .filter(e => e.thumbnail_storage_path && e.id !== id)
    .map(e => ({ id: e.id, name: e.name, image_group: e.image_group }))

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-gray-400 hover:text-white mb-6 block"
      >
        ← Back to exercises
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{exercise.name}</h2>
      <ExerciseEditForm exercise={exercise} relations={relations} thumbnailSources={thumbnailSources} />
    </div>
  )
}
