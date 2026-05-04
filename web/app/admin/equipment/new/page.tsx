import Link from 'next/link'
import { getEnvironments } from '../../../actions/equipment'
import { EquipmentCreateForm } from './EquipmentCreateForm'

export default async function EquipmentNewPage() {
  const environments = await getEnvironments()

  return (
    <div className="max-w-2xl">
      <Link href="/admin/equipment" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Equipment
      </Link>
      <h2 className="text-2xl font-semibold mb-8">Neues Equipment</h2>
      <EquipmentCreateForm environments={environments} />
    </div>
  )
}
