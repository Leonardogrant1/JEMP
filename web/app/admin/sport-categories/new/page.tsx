import Link from 'next/link'
import { SportCategoryCreateForm } from './SportCategoryCreateForm'

export default async function SportCategoryNewPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/sport-categories" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Sport-Kategorien
      </Link>
      <h2 className="text-2xl font-semibold mb-8">Neue Sport-Kategorie</h2>
      <SportCategoryCreateForm />
    </div>
  )
}
