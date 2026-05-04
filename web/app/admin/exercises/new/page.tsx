import Link from 'next/link'
import { getExerciseRelations } from '../../../actions/exercises'
import { ExerciseCreateForm } from './ExerciseCreateForm'

export default async function ExerciseNewPage() {
  const { categories, equipments, environments } = await getExerciseRelations()

  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Exercises
      </Link>
      <h2 className="text-2xl font-semibold mb-8">Neue Übung</h2>
      <ExerciseCreateForm categories={categories} equipments={equipments} environments={environments} />
    </div>
  )
}
