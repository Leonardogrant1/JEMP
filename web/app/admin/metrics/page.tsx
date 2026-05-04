import Link from 'next/link'
import { getMetrics } from '../../actions/metrics'

export default async function MetricsListPage() {
  const metrics = await getMetrics()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">{metrics.length} Metriken</p>
        <Link
          href="/admin/metrics/new"
          className="px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
        >
          + Neu anlegen
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Slug</th>
            <th className="pb-3 pr-6 font-medium">Name (DE)</th>
            <th className="pb-3 pr-4 font-medium">Unit</th>
            <th className="pb-3 font-medium">Höher = besser</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              <td className="py-3 pr-6 font-mono text-xs text-gray-400">
                <Link href={`/admin/metrics/${metric.id}`} className="hover:underline hover:text-white">
                  {metric.slug}
                </Link>
              </td>
              <td className="py-3 pr-6">{metric.name_i18n?.de ?? '—'}</td>
              <td className="py-3 pr-4 text-gray-400">{metric.unit}</td>
              <td className="py-3">
                <span className={metric.higher_is_better ? 'text-green-400' : 'text-red-400'}>
                  {metric.higher_is_better ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
