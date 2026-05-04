import Link from 'next/link'
import { getCategories } from '../../actions/sport-categories'

export default async function SportCategoriesListPage() {
  const categories = await getCategories()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">{categories.length} Kategorien</p>
        <Link
          href="/admin/sport-categories/new"
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
          {categories.map(cat => (
            <tr key={cat.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              <td className="py-3 pr-6 font-mono text-xs text-gray-400">
                <Link href={`/admin/sport-categories/${cat.id}`} className="hover:underline hover:text-white">
                  {cat.slug}
                </Link>
              </td>
              <td className="py-3 pr-6">{cat.name_i18n?.de ?? '—'}</td>
              <td className="py-3 pr-6 text-gray-400">{cat.name_i18n?.en ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
