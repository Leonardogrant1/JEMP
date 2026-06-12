import { getUsers } from '@/app/actions/users'
import { UserTable } from './_components/UserTable'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { users, total } = await getUsers(search, page)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Alle registrierten User</p>
      </div>
      <UserTable
        users={users}
        total={total}
        currentPage={page}
        currentSearch={search}
      />
    </div>
  )
}
