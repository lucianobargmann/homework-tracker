'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function Assignment() {
  const { data: session } = useSession()
  const router = useRouter()
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!session?.user?.email) return

    // Fetch user data to get started_at
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/candidate/profile')
        const userData = await response.json()
        
        if (userData.started_at) {
          const startTime = new Date(userData.started_at)
          setStartedAt(startTime)

          // Calculate initial elapsed time
          const now = new Date()
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)

          // Ensure elapsed time is never negative or NaN
          const validElapsed = isNaN(elapsed) || elapsed < 0 ? 0 : elapsed

          // Debug logging for negative time issues
          if (elapsed < 0) {
            console.error('Negative time detected:', {
              now: now.toISOString(),
              startTime: startTime.toISOString(),
              rawStartedAt: userData.started_at,
              elapsed
            })
          }

          setTimeElapsed(validElapsed)
        } else {
          // If no started_at, redirect back to welcome
          router.push('/welcome')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [session, router])

  useEffect(() => {
    if (!startedAt) return

    // Update timer every second
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

      // Ensure elapsed time is never negative or NaN
      const validElapsed = isNaN(elapsed) || elapsed < 0 ? 0 : elapsed
      setTimeElapsed(validElapsed)

      // Store in localStorage for persistence
      localStorage.setItem('assignment-timer', validElapsed.toString())
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('assignment-timer')
    if (stored && startedAt) {
      const now = new Date()
      const actualElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

      // Use the actual elapsed time (don't trust localStorage completely)
      // Ensure it's never negative or NaN
      const validElapsed = isNaN(actualElapsed) || actualElapsed < 0 ? 0 : actualElapsed
      setTimeElapsed(validElapsed)
    }
  }, [startedAt])

  const formatTime = (seconds: number) => {
    // Handle negative or invalid values
    if (seconds < 0 || !isFinite(seconds)) {
      return '00:00:00'
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = () => {
    router.push('/submit')
  }

  if (!session) {
    return (
      <div className="min-h-screen metacto-gradient flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen metacto-gradient">
      {/* Fixed Timer Header */}
      <div className="bg-metacto-dark/90 backdrop-blur-sm shadow-sm border-b border-metacto-purple/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Coding Assignment
                </h1>
                <p className="text-sm text-metacto-light-gray">
                  {session.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-metacto-orange">Time Elapsed</div>
                <div className={`text-2xl font-mono font-bold ${
                  timeElapsed > 7200 ? 'text-red-400' : timeElapsed > 5400 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {formatTime(timeElapsed)}
                </div>
              </div>
              <button
                onClick={handleSubmit}
                className="btn-metacto-primary px-4 py-2 rounded-md font-medium"
              >
                Submit Assignment
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-metacto-dark/80 backdrop-blur-sm shadow-xl rounded-lg border border-metacto-purple/20">
            <div className="px-6 py-4 border-b border-metacto-purple/20">
              <h2 className="text-lg font-medium text-white">Assignment Instructions</h2>
            </div>

            <div className="p-6">
              {/* PDF Viewer/Download Section */}
              <div className="mb-8">
                <div className="bg-blue-900/30 border border-blue-400/30 rounded-md p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-blue-400">
                        Assignment Document
                      </h3>
                      <p className="text-blue-300 mt-1">
                        Download the PDF with detailed instructions for your coding assignment.
                      </p>
                      <div className="mt-4">
                        <a
                          href="/assignment_v1.pdf"
                          download
                          className="btn-metacto-primary inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        Download Assignment PDF
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Instructions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Important Reminders</h3>
                  <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-md p-4">
                    <ul className="list-disc list-inside space-y-2 text-yellow-300">
                      <li>Use the provided first prompt with Claude Code to track all your interactions</li>
                      <li>The timer started when you clicked "Continue" on the welcome page</li>
                      <li>The timer will persist even if you refresh this page</li>
                      <li>Goal completion time is 2 hours, but there's no hard limit</li>
                      <li>Make sure to submit your work when complete</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Getting Started</h3>
                  <div className="bg-metacto-purple/30 border border-metacto-purple/20 rounded-md p-4">
                    <ol className="list-decimal list-inside space-y-2 text-metacto-light-gray">
                      <li>Download the assignment PDF above</li>
                      <li>Read through all instructions carefully</li>
                      <li>Set up your development environment</li>
                      <li>Start with the first prompt to Claude Code as instructed</li>
                      <li>Work through the assignment step by step</li>
                      <li>When complete, return here and click "Submit Assignment"</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Need Help?</h3>
                  <div className="bg-metacto-purple/30 border border-metacto-purple/20 rounded-md p-4">
                    <p className="text-metacto-light-gray">
                      If you encounter any technical issues with this platform, please contact the administrator.
                      For questions about the assignment itself, refer to the PDF instructions.
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
