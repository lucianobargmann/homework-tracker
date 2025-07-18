'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface JobOpening {
  id: string
  name: string
  created_at: string
}

interface User {
  id: string
  email: string
  submitted_at?: string
  github_link?: string
  prompts_used?: string
}

export default function AdminSettings() {
  const router = useRouter()
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([])
  const [newJobName, setNewJobName] = useState('')
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<User[]>([])
  const [recalculatingScores, setRecalculatingScores] = useState(false)

  useEffect(() => {
    fetchJobOpenings()
    fetchCandidates()
  }, [])

  const handleUnauthorized = () => {
    router.push('/auth/signin')
  }

  const fetchJobOpenings = async () => {
    try {
      const response = await fetch('/api/admin/job-openings')
      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      if (response.ok && Array.isArray(data)) {
        setJobOpenings(data)
      } else {
        console.error('Error fetching job openings:', data.error || 'Invalid response format')
        setJobOpenings([])
      }
    } catch (error) {
      console.error('Error fetching job openings:', error)
      setJobOpenings([])
    }
  }

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/admin/candidates')
      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      if (response.ok && Array.isArray(data)) {
        setCandidates(data)
      } else {
        console.error('Error fetching candidates:', data.error || 'Invalid response format')
        setCandidates([])
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
      setCandidates([])
    }
  }

  const createJobOpening = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newJobName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/job-openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newJobName }),
      })

      if (response.ok) {
        setNewJobName('')
        fetchJobOpenings()
      }
    } catch (error) {
      console.error('Error creating job opening:', error)
    } finally {
      setLoading(false)
    }
  }

  const scoreCandidate = async (userId: string, githubUrl: string, promptsText?: string) => {
    try {
      const response = await fetch('/api/admin/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          githubUrl,
          promptsText,
          allowRescore: true
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to score candidate')
      }

      return true
    } catch (error) {
      console.error('Error scoring candidate:', error)
      return false
    }
  }

  const recalculateAllScores = async () => {
    if (!confirm('This will recalculate scores for all submitted candidates. This may take several minutes. Continue?')) {
      return
    }

    setRecalculatingScores(true)
    let successCount = 0
    let errorCount = 0

    try {
      const submittedCandidates = candidates.filter(c => c.submitted_at && c.github_link)
      
      for (const candidate of submittedCandidates) {
        try {
          console.log(`Recalculating score for ${candidate.email}...`)
          const success = await scoreCandidate(candidate.id, candidate.github_link!, candidate.prompts_used)
          if (success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          console.error(`Error recalculating score for ${candidate.email}:`, error)
          errorCount++
        }
      }

      alert(`Recalculation complete! Success: ${successCount}, Errors: ${errorCount}`)
      
      // Refresh candidates to get updated scores
      fetchCandidates()
    } catch (error) {
      console.error('Error during bulk recalculation:', error)
      alert('Error during bulk recalculation')
    } finally {
      setRecalculatingScores(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Job Opening Management */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Job Opening Management</h2>
          
          {/* Create Job Opening */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">Create New Job Opening</h3>
            <form onSubmit={createJobOpening} className="flex gap-4">
              <input
                type="text"
                placeholder="Job opening name"
                value={newJobName}
                onChange={(e) => setNewJobName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newJobName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                Create Job Opening
              </button>
            </form>
          </div>

          {/* List Job Openings */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">Existing Job Openings</h3>
            <div className="space-y-2">
              {jobOpenings.length === 0 ? (
                <p className="text-gray-500">No job openings created yet.</p>
              ) : (
                jobOpenings.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-gray-900">{job.name}</span>
                    <span className="text-sm text-gray-500">
                      Created: {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Scoring Management */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Scoring Management</h2>
          <div className="flex gap-4">
            <button
              onClick={recalculateAllScores}
              disabled={recalculatingScores || candidates.filter(c => c.submitted_at && c.github_link).length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
            >
              {recalculatingScores ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Recalculating...
                </>
              ) : (
                <>
                  🔄 Recalculate All Scores
                </>
              )}
            </button>
            <span className="text-sm text-gray-500 flex items-center">
              Recalculates scores for all {candidates.filter(c => c.submitted_at && c.github_link).length} submitted candidates
            </span>
          </div>
        </div>

        {/* System Configuration */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <div>
                <h3 className="text-md font-medium text-gray-700">Approval Timer</h3>
                <p className="text-sm text-gray-500">Time delay before sending approval emails</p>
              </div>
              <span className="text-lg font-medium text-gray-900">30 seconds</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <div>
                <h3 className="text-md font-medium text-gray-700">Scoring System</h3>
                <p className="text-sm text-gray-500">Total points available in the scoring system</p>
              </div>
              <span className="text-lg font-medium text-gray-900">315 points</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}