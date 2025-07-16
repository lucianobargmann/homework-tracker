'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface JobOpening {
  id: string
  name: string
  created_at: string
}

interface User {
  id: string
  email: string
  job_opening?: JobOpening
  started_at?: string
  submitted_at?: string
  github_link?: string
  prompts_used?: string
  archived: boolean
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([])
  const [candidates, setCandidates] = useState<User[]>([])
  const [newJobName, setNewJobName] = useState('')
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPrompts, setSelectedPrompts] = useState<{email: string, prompts: string} | null>(null)
  const [showArchived, setShowArchived] = useState(false)

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

      // Handle unauthorized/forbidden responses
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      // Check if the response is successful and contains an array
      if (response.ok && Array.isArray(data)) {
        setJobOpenings(data)
      } else {
        console.error('Error fetching job openings:', data.error || 'Invalid response format')
        setJobOpenings([]) // Set to empty array on error
      }
    } catch (error) {
      console.error('Error fetching job openings:', error)
      setJobOpenings([]) // Set to empty array on error
    }
  }

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/admin/candidates')
      const data = await response.json()

      // Handle unauthorized/forbidden responses
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      // Check if the response is successful and contains an array
      if (response.ok && Array.isArray(data)) {
        setCandidates(data)
      } else {
        console.error('Error fetching candidates:', data.error || 'Invalid response format')
        setCandidates([]) // Set to empty array on error
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
      setCandidates([]) // Set to empty array on error
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

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCandidateEmail.trim() || !selectedJobId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newCandidateEmail,
          job_opening_id: selectedJobId,
        }),
      })

      if (response.ok) {
        setNewCandidateEmail('')
        setSelectedJobId('')
        fetchCandidates()
      }
    } catch (error) {
      console.error('Error creating candidate:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (candidateId: string, archived: boolean) => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !archived }),
      })

      if (response.ok) {
        fetchCandidates()
      }
    } catch (error) {
      console.error('Error updating candidate:', error)
    }
  }

  const getStatus = (candidate: User) => {
    if (!candidate.started_at) return 'Not Started'
    if (candidate.started_at && !candidate.submitted_at) return 'In Progress'
    return 'Completed'
  }

  const getTimeTaken = (candidate: User) => {
    if (!candidate.started_at || !candidate.submitted_at) return '-'
    
    const start = new Date(candidate.started_at)
    const end = new Date(candidate.submitted_at)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${diffHours}h ${diffMinutes}m`
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        {/* Create Job Opening */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create Job Opening</h2>
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

        {/* Add Candidate */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add Candidate</h2>
          <form onSubmit={createCandidate} className="flex gap-4">
            <input
              type="email"
              placeholder="Candidate email"
              value={newCandidateEmail}
              onChange={(e) => setNewCandidateEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCandidateEmail.trim() && selectedJobId) {
                  e.preventDefault()
                  createCandidate(e as any)
                }
              }}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500"
              disabled={loading}
            />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
              disabled={loading}
            >
              <option value="">Select Job Opening</option>
              {jobOpenings.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || !newCandidateEmail.trim() || !selectedJobId}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              Create Candidate
            </button>
          </form>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Candidate Status</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">Show archived candidates</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Opening
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GitHub Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prompts Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archive
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates
                  .filter(candidate => showArchived || !candidate.archived)
                  .map((candidate) => (
                  <tr key={candidate.id} className={candidate.archived ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.job_opening?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getStatus(candidate) === 'Completed' 
                          ? 'bg-green-100 text-green-800'
                          : getStatus(candidate) === 'In Progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatus(candidate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.github_link ? (
                        <a
                          href={candidate.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Repository
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTimeTaken(candidate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {candidate.prompts_used ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedPrompts({email: candidate.email, prompts: candidate.prompts_used!})}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Prompts ({candidate.prompts_used.split('\n').filter(line => line.trim()).length} lines)
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={candidate.archived}
                        onChange={() => toggleArchive(candidate.id, candidate.archived)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fullscreen Prompts Modal */}
      {selectedPrompts && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Prompts Used by {selectedPrompts.email}
              </h2>
              <button
                onClick={() => setSelectedPrompts(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border text-gray-900">
                {selectedPrompts.prompts}
              </pre>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedPrompts(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
