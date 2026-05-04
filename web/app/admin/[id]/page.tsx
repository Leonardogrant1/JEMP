import Link from 'next/link'
import { getExercise, getExerciseRelations } from '../../actions/exercises'
import { ExerciseEditForm } from './ExerciseEditForm'

// In Next.js 15+, params is a Promise
export default async function ExerciseEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [exercise, relations] = await Promise.all([getExercise(id), getExerciseRelations()])

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-gray-400 hover:text-white mb-6 block"
      >
        ← Back to exercises
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{exercise.name}</h2>
      <ExerciseEditForm exercise={exercise} relations={relations} />
    </div>
  )
}
