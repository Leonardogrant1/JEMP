import Link from 'next/link'
import { MetricCreateForm } from './MetricCreateForm'

export default async function MetricNewPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/metrics" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Metriken
      </Link>
      <h2 className="text-2xl font-semibold mb-8">Neue Metrik</h2>
      <MetricCreateForm />
    </div>
  )
}
