'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface JobOpening {
  id: string
  name: string
  created_at: string
}

interface ScoringResult {
  id: string
  total_score: number
  max_score: number
  percentage: number
  report_data: string
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
  approval_status?: string | null
  approved_at?: string
  created_at: string
  scoring_results?: ScoringResult[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([])
  const [candidates, setCandidates] = useState<User[]>([])
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPrompts, setSelectedPrompts] = useState<{email: string, prompts: string} | null>(null)
  const [scoringCandidate, setScoringCandidate] = useState<string | null>(null)
  const [scoringResults, setScoringResults] = useState<{[key: string]: any}>({})
  const [showScoringModal, setShowScoringModal] = useState(false)
  const [selectedScoring, setSelectedScoring] = useState<any>(null)
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editJobId, setEditJobId] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobOpeningFilter, setJobOpeningFilter] = useState('all')
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('all')
  const [globalJobFilter, setGlobalJobFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [approvingCandidates, setApprovingCandidates] = useState<Set<string>>(new Set())
  const [approvalTimers, setApprovalTimers] = useState<Map<string, NodeJS.Timeout>>(new Map())
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetchJobOpenings()
    fetchCandidates()
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      approvalTimers.forEach(timer => clearTimeout(timer))
    }
  }, [approvalTimers])

  const handleUnauthorized = () => {
    router.push('/auth/signin')
  }

  const scoreCandidate = async (userId: string, githubUrl: string, promptsText?: string) => {
    setScoringCandidate(userId)
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
          allowRescore: true  // Always allow rescoring to overwrite existing scores
        })
      })

      const data = await response.json()

      if (response.ok) {
        setScoringResults(prev => ({
          ...prev,
          [userId]: data.scoringResult
        }))
      } else {
        alert(`Error scoring candidate: ${data.error}`)
      }
    } catch (error) {
      console.error('Error scoring candidate:', error)
      alert('Error scoring candidate')
    } finally {
      setScoringCandidate(null)
    }
  }

  const viewScoringDetails = (result: any) => {
    setSelectedScoring(result)
    setShowScoringModal(true)
  }

  const startEditCandidate = (candidate: User) => {
    setEditingCandidate(candidate.id)
    setEditEmail(candidate.email)
    setEditJobId(candidate.job_opening?.id || '')
  }

  const cancelEdit = () => {
    setEditingCandidate(null)
    setEditEmail('')
    setEditJobId('')
  }

  const saveEdit = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: editEmail.trim().toLowerCase(),
          job_opening_id: editJobId || null
        })
      })

      if (response.ok) {
        // Update local state
        setCandidates(prev => prev.map(c => 
          c.id === candidateId 
            ? { ...c, email: editEmail.trim().toLowerCase(), job_opening: jobOpenings.find(j => j.id === editJobId) }
            : c
        ))
        cancelEdit()
      } else {
        const data = await response.json()
        alert(`Error updating candidate: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating candidate:', error)
      alert('Error updating candidate')
    }
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

  const approveCandidate = async (candidateId: string, candidateEmail: string) => {
    try {
      setApprovingCandidates(prev => new Set(prev).add(candidateId))
      
      const response = await fetch(`/api/admin/candidates/${candidateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Approval process started for ${candidateEmail}. Email will be sent in 30 seconds. Click the button again to cancel.`)
        fetchCandidates() // Refresh to show updated status
        
        // Set a local timer to update UI after 30 seconds
        const timer = setTimeout(() => {
          setApprovingCandidates(prev => {
            const newSet = new Set(prev)
            newSet.delete(candidateId)
            return newSet
          })
          setApprovalTimers(prev => {
            const newMap = new Map(prev)
            newMap.delete(candidateId)
            return newMap
          })
          fetchCandidates() // Refresh to show final approved status
        }, 30 * 1000) // 30 seconds
        
        setApprovalTimers(prev => new Map(prev).set(candidateId, timer))
      } else {
        alert(`Error approving candidate: ${data.error}`)
        setApprovingCandidates(prev => {
          const newSet = new Set(prev)
          newSet.delete(candidateId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error approving candidate:', error)
      alert('Error approving candidate')
      setApprovingCandidates(prev => {
        const newSet = new Set(prev)
        newSet.delete(candidateId)
        return newSet
      })
    }
  }

  const cancelApproval = async (candidateId: string, candidateEmail: string) => {
    try {
      // Clear the local timer
      const timer = approvalTimers.get(candidateId)
      if (timer) {
        clearTimeout(timer)
        setApprovalTimers(prev => {
          const newMap = new Map(prev)
          newMap.delete(candidateId)
          return newMap
        })
      }

      // Cancel the approval in the backend
      const response = await fetch(`/api/admin/candidates/${candidateId}/cancel-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setApprovingCandidates(prev => {
          const newSet = new Set(prev)
          newSet.delete(candidateId)
          return newSet
        })
        alert(`Approval cancelled for ${candidateEmail}. No email will be sent.`)
        fetchCandidates() // Refresh to show updated status
      } else {
        const data = await response.json()
        alert(`Error cancelling approval: ${data.error}`)
      }
    } catch (error) {
      console.error('Error cancelling approval:', error)
      alert('Error cancelling approval')
    }
  }

  const rejectCandidate = async (candidateId: string, candidateEmail: string) => {
    if (!confirm(`Are you sure you want to reject ${candidateEmail}? This will send a rejection email immediately.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        fetchCandidates() // Refresh to show updated status
      } else {
        alert(`Error rejecting candidate: ${data.error}`)
      }
    } catch (error) {
      console.error('Error rejecting candidate:', error)
      alert('Error rejecting candidate')
    }
  }

  const getStatus = (candidate: User) => {
    if (!candidate.started_at) return 'Not Started'
    if (candidate.started_at && !candidate.submitted_at) return 'In Progress'
    if (candidate.submitted_at && !candidate.approval_status) return 'Completed'
    if (candidate.approval_status === 'approving') return 'Approving...'
    if (candidate.approval_status === 'approved') return 'Approved'
    if (candidate.approval_status === 'rejected') return 'Rejected'
    return 'Completed'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800'
      case 'Approving...': return 'bg-blue-100 text-blue-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortValue = (candidate: User, field: string): any => {
    switch (field) {
      case 'email':
        return candidate.email.toLowerCase()
      case 'job_opening':
        return candidate.job_opening?.name || ''
      case 'status':
        return getStatus(candidate)
      case 'time_taken':
        if (!candidate.started_at || !candidate.submitted_at) return 0
        return new Date(candidate.submitted_at).getTime() - new Date(candidate.started_at).getTime()
      case 'created_at':
        return new Date(candidate.created_at).getTime()
      case 'ai_score':
        return candidate.scoring_results && candidate.scoring_results.length > 0 
          ? candidate.scoring_results[0].percentage 
          : -1
      default:
        return new Date(candidate.created_at).getTime()
    }
  }

  // Filter, sort, and paginate candidates
  const filteredCandidates = candidates
    .filter(candidate => showArchived || !candidate.archived)
    .filter(candidate => candidate.email.toLowerCase().includes(searchEmail.toLowerCase()))
    .filter(candidate => {
      if (statusFilter === 'all') return true
      const candidateStatus = getStatus(candidate)
      return candidateStatus === statusFilter
    })
    .filter(candidate => {
      if (jobOpeningFilter === 'all') return true
      return candidate.job_opening?.id === jobOpeningFilter
    })
    .filter(candidate => {
      if (approvalStatusFilter === 'all') return true
      if (approvalStatusFilter === 'pending') return !candidate.approval_status
      return candidate.approval_status === approvalStatusFilter
    })
    .sort((a, b) => {
      const aValue = getSortValue(a, sortField)
      const bValue = getSortValue(b, sortField)
      
      if (aValue === bValue) return 0
      
      const comparison = aValue < bValue ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE)
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchEmail, showArchived, statusFilter, jobOpeningFilter, approvalStatusFilter, sortField, sortDirection])

  // Apply global job filter to candidates for statistics
  const statsFilteredCandidates = globalJobFilter === 'all' 
    ? candidates 
    : candidates.filter(c => c.job_opening?.id === globalJobFilter)

  // Calculate statistics
  const totalCandidates = statsFilteredCandidates.length
  const archivedCandidates = statsFilteredCandidates.filter(c => c.archived).length
  const notStartedCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'Not Started').length
  const inProgressCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'In Progress').length
  const completedCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'Completed').length
  const approvingCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'Approving...').length
  const approvedCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'Approved').length
  const rejectedCount = statsFilteredCandidates.filter(c => !c.archived && getStatus(c) === 'Rejected').length
  const totalJobOpenings = jobOpenings.length
  const avgCompletionTime = statsFilteredCandidates
    .filter(c => c.started_at && c.submitted_at)
    .reduce((total, c) => {
      const start = new Date(c.started_at!)
      const end = new Date(c.submitted_at!)
      return total + (end.getTime() - start.getTime())
    }, 0) / statsFilteredCandidates.filter(c => c.started_at && c.submitted_at).length

  const formatAvgTime = (ms: number) => {
    if (isNaN(ms)) return '0h 0m'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field
    return (
      <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-blue-500">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </th>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link
            href="/admin/settings"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            ⚙️ Settings
          </Link>
        </div>
        
        {/* Global Job Filter */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter Statistics by Job Opening:</label>
            <select
              value={globalJobFilter}
              onChange={(e) => setGlobalJobFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
            >
              <option value="all">All Job Openings</option>
              {jobOpenings.map(job => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Candidates</p>
                <p className="text-2xl font-bold text-blue-900">{totalCandidates}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">{inProgressCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏱️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Avg. Time</p>
                <p className="text-2xl font-bold text-purple-900">{formatAvgTime(avgCompletionTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Not Started</p>
                <p className="text-xl font-bold text-gray-900">{notStartedCount}</p>
              </div>
              <div className="text-gray-400">🔄</div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Approved</p>
                <p className="text-xl font-bold text-green-900">{approvedCount}</p>
              </div>
              <div className="text-green-400">✅</div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejected</p>
                <p className="text-xl font-bold text-red-900">{rejectedCount}</p>
              </div>
              <div className="text-red-400">❌</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Approving</p>
                <p className="text-xl font-bold text-blue-900">{approvingCount}</p>
              </div>
              <div className="text-blue-400">⏳</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Archived</p>
                <p className="text-xl font-bold text-gray-900">{archivedCandidates}</p>
              </div>
              <div className="text-gray-400">📦</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Job Openings</p>
                <p className="text-xl font-bold text-gray-900">{totalJobOpenings}</p>
              </div>
              <div className="text-gray-400">💼</div>
            </div>
          </div>
        </div>
        
        {/* Add Candidate */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add Candidate</h2>
          <form onSubmit={createCandidate} className="flex gap-4">
            <input
              type="email"
              placeholder="Candidate email"
              value={newCandidateEmail}
              onChange={(e) => setNewCandidateEmail(e.target.value.trim())}
              onPaste={(e) => {
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text').trim()
                setNewCandidateEmail(pastedText)
              }}
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
        <div className="w-full bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500 w-64"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Approving...">Approving</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={jobOpeningFilter}
                  onChange={(e) => setJobOpeningFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                >
                  <option value="all">All Job Openings</option>
                  {jobOpenings.map(job => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                >
                  <option value="all">All Approval Status</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approving">Approving (30s timer)</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Showing {paginatedCandidates.length} of {filteredCandidates.length} candidates
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="email">
                    Email
                  </SortableHeader>
                  <SortableHeader field="job_opening">
                    Job Opening
                  </SortableHeader>
                  <SortableHeader field="status">
                    Status
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GitHub Link
                  </th>
                  <SortableHeader field="time_taken">
                    Time Taken
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prompts Used
                  </th>
                  <SortableHeader field="created_at">
                    Created At
                  </SortableHeader>
                  <SortableHeader field="ai_score">
                    AI Score
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCandidates.map((candidate) => (
                  <tr key={candidate.id} className={`${candidate.archived ? 'opacity-50' : ''} border-b-2 border-gray-100`}>
                    {/* First row - Main info */}
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left column - Basic info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Email:</span>
                            {editingCandidate === candidate.id ? (
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                placeholder="Email"
                              />
                            ) : (
                              <span 
                                className="cursor-pointer hover:text-blue-600 hover:underline text-sm text-gray-900"
                                onClick={() => startEditCandidate(candidate)}
                              >
                                {candidate.email}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Job Opening:</span>
                            {editingCandidate === candidate.id ? (
                              <select
                                value={editJobId}
                                onChange={(e) => setEditJobId(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                              >
                                <option value="">No Job Opening</option>
                                {jobOpenings.map(job => (
                                  <option key={job.id} value={job.id}>{job.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span 
                                className="cursor-pointer hover:text-blue-600 hover:underline text-sm text-gray-600"
                                onClick={() => startEditCandidate(candidate)}
                              >
                                {candidate.job_opening?.name || 'None'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Status:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getStatus(candidate))}`}>
                              {getStatus(candidate)}
                            </span>
                          </div>
                        </div>

                        {/* Middle column - Assignment info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">GitHub:</span>
                            {candidate.github_link ? (
                              <a
                                href={candidate.github_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-48"
                                title={candidate.github_link}
                              >
                                View Repository
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">Not submitted</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Time Taken:</span>
                            <span className="text-sm text-gray-600">{getTimeTaken(candidate)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Created:</span>
                            <span className="text-sm text-gray-600">
                              {new Date(candidate.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Right column - Prompts and Scoring */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Prompts:</span>
                            {candidate.prompts_used ? (
                              <button
                                onClick={() => setSelectedPrompts({email: candidate.email, prompts: candidate.prompts_used!})}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                View ({candidate.prompts_used.split('\n').filter(line => line.trim()).length} lines)
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">AI Score:</span>
                            {candidate.github_link ? (
                              <div className="flex items-center gap-2">
                                {candidate.scoring_results && candidate.scoring_results.length > 0 ? (
                                  <>
                                    <span className="text-green-600 font-semibold text-sm">
                                      {candidate.scoring_results[0].percentage.toFixed(1)}% 
                                      <span className="text-gray-500 text-xs ml-1">(Auto)</span>
                                    </span>
                                    <button
                                      onClick={() => viewScoringDetails(JSON.parse(candidate.scoring_results![0].report_data))}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Details
                                    </button>
                                  </>
                                ) : scoringResults[candidate.id] ? (
                                  <>
                                    <span className="text-green-600 font-semibold text-sm">
                                      {scoringResults[candidate.id].percentage.toFixed(1)}%
                                      <span className="text-gray-500 text-xs ml-1">(Manual)</span>
                                    </span>
                                    <button
                                      onClick={() => viewScoringDetails(scoringResults[candidate.id])}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Details
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => scoreCandidate(candidate.id, candidate.github_link!, candidate.prompts_used || undefined)}
                                    disabled={scoringCandidate === candidate.id}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {scoringCandidate === candidate.id ? 'Scoring...' : 'Score'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No GitHub link</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Second row - Actions */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {editingCandidate === candidate.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(candidate.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditCandidate(candidate)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Edit Info
                                </button>
                                
                                {/* Approval and Rejection buttons - only show for completed candidates who haven't been processed yet */}
                                {candidate.submitted_at && 
                                 !candidate.approval_status && 
                                 candidate.github_link && 
                                 !approvingCandidates.has(candidate.id) && (
                                  <>
                                    <button
                                      onClick={() => approveCandidate(candidate.id, candidate.email)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                      Approve Candidate
                                    </button>
                                    
                                    <button
                                      onClick={() => rejectCandidate(candidate.id, candidate.email)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                      Reject Candidate
                                    </button>
                                  </>
                                )}

                                {/* Cancel Approval button - show when approval is in progress (either local or database state) */}
                                {(approvingCandidates.has(candidate.id) || candidate.approval_status === 'approving') && (
                                  <button
                                    onClick={() => cancelApproval(candidate.id, candidate.email)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                                  >
                                    Cancel Approval
                                  </button>
                                )}

                                {/* Show approval status for candidates in process or approved */}
                                {(candidate.approval_status === 'approving' || approvingCandidates.has(candidate.id)) && (
                                  <span className="text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1 rounded">
                                    ⏳ Approving... (Email in 30 seconds)
                                  </span>
                                )}
                                
                                {candidate.approval_status === 'approved' && (
                                  <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded">
                                    ✅ Approved
                                  </span>
                                )}

                                {candidate.approval_status === 'rejected' && (
                                  <span className="text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded">
                                    ❌ Rejected
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={candidate.archived}
                                onChange={() => toggleArchive(candidate.id, candidate.archived)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                              />
                              Archived
                            </label>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Prompts Modal */}
      {selectedPrompts && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col">
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

      {/* Scoring Details Modal */}
      {showScoringModal && selectedScoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[90vw] max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                AI Challenge Scoring Report
              </h2>
              <button
                onClick={() => setShowScoringModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-3xl font-bold text-green-600">
                    {selectedScoring.percentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedScoring.totalScore} / {selectedScoring.maxScore} points
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Generated: {new Date(selectedScoring.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-6">
                {selectedScoring.categories.map((category: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {category.score} / {category.maxScore}
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {category.subcategories.map((sub: any, subIndex: number) => (
                        <div key={subIndex} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-800">{sub.name}</h4>
                            <span className="text-sm text-gray-600">
                              {sub.score} / {sub.maxScore}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{sub.feedback}</p>
                          {sub.evidence.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <strong>Evidence:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {sub.evidence.map((item: string, evidenceIndex: number) => (
                                  <li key={evidenceIndex}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {selectedScoring.recommendations.length > 0 && (
                <div className="mt-6 border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                    {selectedScoring.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowScoringModal(false)}
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
