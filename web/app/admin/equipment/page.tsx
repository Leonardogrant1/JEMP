import Link from 'next/link'
import { getEquipments } from '../../actions/equipment'
import { asI18n } from '@/lib/i18n'

export default async function EquipmentListPage() {
  const equipments = await getEquipments()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">{equipments.length} Equipments</p>
        <Link
          href="/admin/equipment/new"
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
            <th className="pb-3 pr-6 font-medium">Name (EN)</th>
          </tr>
        </thead>
        <tbody>
          {equipments.map(eq => (
            <tr key={eq.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              <td className="py-3 pr-6 font-mono text-xs text-gray-400">
                <Link href={`/admin/equipment/${eq.id}`} className="hover:underline hover:text-white">
                  {eq.slug}
                </Link>
              </td>
              <td className="py-3 pr-6">{asI18n(eq.name_i18n).de || '—'}</td>
              <td className="py-3 pr-6 text-gray-400">{asI18n(eq.name_i18n).en || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
