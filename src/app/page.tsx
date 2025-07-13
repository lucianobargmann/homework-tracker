'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      // Add a small delay to prevent flash before redirect
      const timer = setTimeout(() => {
        router.push('/auth/signin')
      }, 100)
      return () => clearTimeout(timer)
    }

    // Redirect based on user type
    if (session.user?.is_admin) {
      router.push('/admin')
    } else {
      router.push('/welcome')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen metacto-gradient flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen metacto-gradient flex items-center justify-center">
      <div className="text-lg text-white">Redirecting...</div>
    </div>
  )
}
