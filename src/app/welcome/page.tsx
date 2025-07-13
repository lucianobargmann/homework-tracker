'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Welcome() {
  const { data: session } = useSession()
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = () => {
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // Start the assignment by setting started_at
      const response = await fetch('/api/candidate/start', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/assignment')
      } else {
        console.error('Failed to start assignment')
      }
    } catch (error) {
      console.error('Error starting assignment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  if (!session) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Your Coding Assignment
            </h1>
            <p className="text-lg text-gray-600">
              Hello {session.user?.email}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Important: Timed Exercise
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This is a timed exercise. No hard limit, but the goal is 2 hours. 
                    Only continue if you have 2 uninterrupted hours available.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  First Prompt for Claude Code
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="font-mono bg-blue-100 p-2 rounded">
                    "For each prompt I give you, write to a file prompts.txt, so I can audit the work."
                  </p>
                  <p className="mt-2">
                    Use this as your first prompt to Claude Code to ensure all your interactions are tracked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleContinue}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-md text-lg"
            >
              Continue to Assignment
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-[480px] max-w-[90vw] shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Are you ready to begin?
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Once started, the timer cannot be reset. Make sure you have 2 uninterrupted hours available.
                </p>
              </div>
              <div className="items-center px-4 py-3 flex justify-center gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white text-base font-medium rounded-md min-w-[120px] hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Yes, Start'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 text-base font-medium rounded-md min-w-[120px] hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
