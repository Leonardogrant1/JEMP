import Link from 'next/link'
import { getCategory } from '../../../actions/sport-categories'
import { SportCategoryEditForm } from './SportCategoryEditForm'

export default async function SportCategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await getCategory(id)

  return (
    <div className="max-w-2xl">
      <Link href="/admin/sport-categories" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Sport-Kategorien
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{category.name_i18n?.de ?? category.slug}</h2>
      <SportCategoryEditForm category={category} />
    </div>
  )
}
