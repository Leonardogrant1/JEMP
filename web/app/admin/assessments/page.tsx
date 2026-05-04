import Link from 'next/link'
import { getAssessments } from '../../actions/assessments'

export default async function AssessmentsListPage() {
  const assessments = await getAssessments()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">{assessments.length} Assessments</p>
        <Link
          href="/admin/assessments/new"
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
            <th className="pb-3 pr-6 font-medium">Kategorie</th>
            <th className="pb-3 font-medium">Metrik</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map(a => (
            <tr key={a.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              <td className="py-3 pr-6 font-mono text-xs text-gray-400">
                <Link href={`/admin/assessments/${a.id}`} className="hover:underline hover:text-white">
                  {a.slug}
                </Link>
              </td>
              <td className="py-3 pr-6">{a.name_i18n?.de ?? a.name ?? '—'}</td>
              <td className="py-3 pr-6 text-gray-400">{a.category_slug}</td>
              <td className="py-3 text-gray-400">{a.metric_slug} <span className="text-gray-600">({a.metric_unit})</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
