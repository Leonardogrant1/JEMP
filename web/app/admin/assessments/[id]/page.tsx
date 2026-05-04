import Link from 'next/link'
import { getAssessment } from '../../../actions/assessments'
import { getCategories } from '../../../actions/sport-categories'
import { getMetrics } from '../../../actions/metrics'
import { getEquipments } from '../../../actions/equipment'
import { AssessmentEditForm } from './AssessmentEditForm'

export default async function AssessmentEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [assessment, categories, metrics, equipments] = await Promise.all([
    getAssessment(id),
    getCategories(),
    getMetrics(),
    getEquipments(),
  ])

  return (
    <div className="max-w-2xl">
      <Link href="/admin/assessments" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Assessments
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{assessment.name_i18n?.de ?? assessment.name}</h2>
      <AssessmentEditForm
        assessment={assessment}
        categories={categories}
        metrics={metrics}
        equipments={equipments}
      />
    </div>
  )
}
