'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/sign-in')
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-gray-400 hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}
