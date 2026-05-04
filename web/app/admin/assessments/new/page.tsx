import Link from 'next/link'
import { getCategories } from '../../../actions/sport-categories'
import { getMetrics } from '../../../actions/metrics'
import { getEquipments } from '../../../actions/equipment'
import { AssessmentCreateForm } from './AssessmentCreateForm'

export default async function AssessmentNewPage() {
  const [categories, metrics, equipments] = await Promise.all([
    getCategories(),
    getMetrics(),
    getEquipments(),
  ])

  return (
    <div className="max-w-2xl">
      <Link href="/admin/assessments" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Assessments
      </Link>
      <h2 className="text-2xl font-semibold mb-8">Neues Assessment</h2>
      <AssessmentCreateForm
        categories={categories}
        metrics={metrics}
        equipments={equipments}
      />
    </div>
  )
}
