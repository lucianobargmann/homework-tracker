import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'

interface HeaderProps {
  showLogo?: boolean
  title?: string
  className?: string
  showSignOut?: boolean
}

export default function Header({ showLogo = true, title, className = '', showSignOut = false }: HeaderProps) {
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <header className={`bg-metacto-dark border-b border-metacto-purple/20 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {showLogo && (
              <div className="flex-shrink-0">
                <Image
                  src="/metacto-logo.svg"
                  alt="MetaCTO"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
            )}
            {title && (
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-white">{title}</h1>
              </div>
            )}
          </div>

          {showSignOut && session && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-metacto-light-gray hidden sm:block">
                {session.user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="btn-metacto-secondary px-4 py-2 text-sm font-medium rounded-md"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
