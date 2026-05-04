import Link from 'next/link'
import { getMetric } from '../../../actions/metrics'
import { MetricEditForm } from './MetricEditForm'
import { asI18n } from '@/lib/i18n'

export default async function MetricEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const metric = await getMetric(id)

  return (
    <div className="max-w-2xl">
      <Link href="/admin/metrics" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Metriken
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{asI18n(metric.name_i18n).de || metric.slug}</h2>
      <MetricEditForm metric={metric} />
    </div>
  )
}
