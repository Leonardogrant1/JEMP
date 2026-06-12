import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchUserProfile, fetchUserActivePlan, fetchUserPlanStructure } from '@/app/actions/users'
import { ProfileSection } from '../_components/ProfileSection'
import { PlanSection } from '../_components/PlanSection'
import { SubscriptionSection, SubscriptionSkeleton } from '../_components/SubscriptionSection'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profile, plan] = await Promise.all([
    fetchUserProfile(id),
    fetchUserActivePlan(id),
  ])

  if (!profile) notFound()

  const planStructure = plan ? await fetchUserPlanStructure(plan.id) : null

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/admin/users" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Alle User
        </Link>
        <h1 className="text-xl font-semibold mt-2">{displayName}</h1>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">{id}</p>
      </div>

      {/* Profile */}
      <ProfileSection profile={profile} />

      {/* Plan */}
      <PlanSection plan={plan} planStructure={planStructure} userId={id} />

      {/* Subscription (independent Suspense) */}
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionSection userId={id} />
      </Suspense>
    </div>
  )
}
