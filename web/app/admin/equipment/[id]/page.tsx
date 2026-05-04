import Link from 'next/link'
import { getEquipment, getEnvironments } from '../../../actions/equipment'
import { EquipmentEditForm } from './EquipmentEditForm'
import { asI18n } from '@/lib/i18n'

export default async function EquipmentEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [equipment, environments] = await Promise.all([
    getEquipment(id),
    getEnvironments(),
  ])

  return (
    <div className="max-w-2xl">
      <Link href="/admin/equipment" className="text-sm text-gray-400 hover:text-white mb-6 block">
        ← Zurück zu Equipment
      </Link>
      <h2 className="text-2xl font-semibold mb-8">{asI18n(equipment.name_i18n).de || equipment.slug}</h2>
      <EquipmentEditForm equipment={equipment} environments={environments} />
    </div>
  )
}
