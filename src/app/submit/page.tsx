'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Submit() {
  const { data: session } = useSession()
  const router = useRouter()
  const [githubLink, setGithubLink] = useState('')
  const [promptsUsed, setPromptsUsed] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [finalTimeElapsed, setFinalTimeElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!session?.user?.email) return

    // Fetch user data to check if already submitted
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/candidate/profile')
        const userData = await response.json()
        
        if (userData.submitted_at) {
          setSubmitted(true)
          setSubmittedAt(userData.submitted_at)
          setGithubLink(userData.github_link || '')
          setPromptsUsed(userData.prompts_used || '')

          // Calculate final time for completed submissions
          if (userData.started_at) {
            const startTime = new Date(userData.started_at)
            const endTime = new Date(userData.submitted_at)
            const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
            setFinalTimeElapsed(elapsed)
          }
        }

        if (userData.started_at) {
          const startTime = new Date(userData.started_at)
          setStartedAt(startTime)

          // Only calculate current elapsed time if not yet submitted
          if (!userData.submitted_at) {
            const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
            setTimeElapsed(elapsed)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [session])

  // Keep timer running until submission
  useEffect(() => {
    if (!startedAt || submitted) return

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
      setTimeElapsed(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, submitted])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!githubLink.trim() || !promptsUsed.trim()) {
      alert('Please fill in both GitHub link and prompts used.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/candidate/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_link: githubLink.trim(),
          prompts_used: promptsUsed.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubmitted(true)
        setSubmittedAt(data.submitted_at)

        // Set final elapsed time and stop the running timer
        if (startedAt) {
          const endTime = new Date(data.submitted_at)
          const elapsed = Math.floor((endTime.getTime() - startedAt.getTime()) / 1000)
          setFinalTimeElapsed(elapsed)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit assignment')
      }
    } catch (error) {
      console.error('Error submitting assignment:', error)
      alert('An error occurred while submitting')
    } finally {
      setLoading(false)
    }
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
              Submit Your Assignment
            </h1>
            <p className="text-lg text-gray-600">
              {session.user?.email}
            </p>
            {startedAt && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <div className="text-sm text-blue-600">
                  {submitted ? 'Total Time Taken' : 'Current Time Elapsed'}
                </div>
                <div className={`text-2xl font-mono font-bold ${
                  (finalTimeElapsed || timeElapsed) > 7200 ? 'text-red-600' :
                  (finalTimeElapsed || timeElapsed) > 5400 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {formatTime(finalTimeElapsed || timeElapsed)}
                </div>
              </div>
            )}
          </div>

          {submitted ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-md p-6 mb-8">
                <div className="flex justify-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-green-800">
                      Submission Received
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Your assignment was submitted on {new Date(submittedAt!).toLocaleString()}.
                      </p>
                      <p className="mt-2 font-medium">
                        Any changes made after this timestamp will not be considered.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-6 text-left">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submitted Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GitHub Repository</label>
                    <a
                      href={githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-blue-600 hover:text-blue-800 break-all"
                    >
                      {githubLink}
                    </a>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prompts Used</label>
                    <div className="mt-1 p-3 bg-white border border-gray-300 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm text-gray-900">{promptsUsed}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="github-link" className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  id="github-link"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Provide the full URL to your GitHub repository containing the completed assignment.
                </p>
              </div>

              <div>
                <label htmlFor="prompts-used" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompts Used *
                </label>
                <textarea
                  id="prompts-used"
                  value={promptsUsed}
                  onChange={(e) => setPromptsUsed(e.target.value)}
                  rows={10}
                  placeholder="Paste all the prompts you used with Claude Code here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Include all prompts you used during the assignment for audit purposes.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Once you submit, you cannot make changes. Make sure your GitHub repository is complete and accessible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading || !githubLink.trim() || !promptsUsed.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-md text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
