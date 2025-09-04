'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BearerToken {
  id: string
  name: string
  token: string
  created_by: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export default function TokenManagement() {
  const router = useRouter()
  const [tokens, setTokens] = useState<BearerToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewToken, setShowNewToken] = useState(false)
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<BearerToken | null>(null)

  useEffect(() => {
    fetchTokens()
  }, [])

  const handleUnauthorized = () => {
    router.push('/auth/signin')
  }

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/admin/bearer-tokens')
      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      if (response.ok && Array.isArray(data)) {
        setTokens(data)
      } else {
        console.error('Error fetching tokens:', data.error || 'Invalid response format')
        setTokens([])
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setTokens([])
    }
  }

  const createToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTokenName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/bearer-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTokenName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewTokenName('')
        setNewlyCreatedToken(data)
        setShowNewToken(false)
        fetchTokens()
      } else {
        alert(`Error creating token: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating token:', error)
      alert('Error creating token')
    } finally {
      setLoading(false)
    }
  }

  const toggleTokenStatus = async (tokenId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/bearer-tokens/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        fetchTokens()
      } else {
        const data = await response.json()
        alert(`Error updating token: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating token:', error)
      alert('Error updating token')
    }
  }

  const deleteToken = async (tokenId: string, tokenName: string) => {
    if (!confirm(`Are you sure you want to delete the token "${tokenName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/bearer-tokens/${tokenId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTokens()
      } else {
        const data = await response.json()
        alert(`Error deleting token: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting token:', error)
      alert('Error deleting token')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const maskedToken = (token: string) => {
    if (token.length <= 8) return token
    return token.substring(0, 4) + '...' + token.substring(token.length - 4)
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bearer Token Management</h1>
            <p className="text-gray-600 mt-1">Manage API tokens for external applications</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* API Usage Instructions */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">API Usage</h2>
          <p className="text-blue-800 mb-4">
            Use bearer tokens to authenticate API requests for adding candidates:
          </p>
          <div className="bg-blue-100 rounded p-4 font-mono text-sm text-blue-900">
            <div className="mb-2"><strong>Endpoint:</strong> POST /api/candidates</div>
            <div className="mb-2"><strong>Header:</strong> Authorization: Bearer &lt;your-token&gt;</div>
            <div className="mb-2"><strong>Body:</strong></div>
            <pre className="ml-4 whitespace-pre-wrap">{`{
  "email": "candidate@example.com",
  "jobOpeningName": "Software Engineer"
}`}</pre>
          </div>
        </div>

        {/* Create Token */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Create New Token</h2>
            {!showNewToken && (
              <button
                onClick={() => setShowNewToken(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                + New Token
              </button>
            )}
          </div>
          
          {showNewToken && (
            <form onSubmit={createToken} className="flex gap-4">
              <input
                type="text"
                placeholder="Token name (e.g., HR System, Recruitment Tool)"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !newTokenName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                Create Token
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewToken(false)
                  setNewTokenName('')
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* New Token Display */}
        {newlyCreatedToken && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-green-900">New Token Created!</h2>
              <button
                onClick={() => setNewlyCreatedToken(null)}
                className="text-green-600 hover:text-green-800 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-green-800 mb-4">
              <strong>Important:</strong> Copy this token now. You won't be able to see it again!
            </p>
            <div className="bg-white border border-green-300 rounded p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm break-all text-gray-900">
                  {newlyCreatedToken.token}
                </div>
                <button
                  onClick={() => copyToClipboard(newlyCreatedToken.token)}
                  className="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tokens Table */}
        <div className="w-full bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Tokens</h2>
            <p className="text-gray-600 text-sm mt-1">
              {tokens.length} token{tokens.length !== 1 ? 's' : ''} total
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokens.map((token) => (
                  <tr key={token.id} className={`${!token.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {token.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-mono">
                          {maskedToken(token.token)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(token.token)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Copy full token"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {token.created_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(token.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {token.last_used ? formatDate(token.last_used) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        token.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {token.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTokenStatus(token.id, token.is_active)}
                          className={`text-xs px-3 py-1 rounded ${
                            token.is_active
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {token.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteToken(token.id, token.name)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {tokens.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tokens created yet. Create your first token above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}