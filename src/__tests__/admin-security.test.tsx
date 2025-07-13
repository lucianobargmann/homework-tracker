/**
 * Integration tests for admin page security
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/app/admin/page'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/navigation
jest.mock('next/navigation')
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()
const mockRouter = { push: mockPush }

// Mock fetch globally
global.fetch = jest.fn()

describe('Admin Dashboard Security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should redirect to signin when API returns 401 Unauthorized', async () => {
    // Mock session as if user is logged in
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@test.com' } },
      status: 'authenticated',
    } as any)

    // Mock API to return 401
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

    render(<AdminDashboard />)

    // Wait for the API calls to complete and redirect to be triggered
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    // Verify fetch was called for both endpoints
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/job-openings')
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/candidates')
  })

  it('should redirect to signin when API returns 403 Forbidden', async () => {
    // Mock session as if user is logged in
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@test.com' } },
      status: 'authenticated',
    } as any)

    // Mock API to return 403
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      })

    render(<AdminDashboard />)

    // Wait for the API calls to complete and redirect to be triggered
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })
  })

  it('should load data successfully when user is authorized', async () => {
    // Mock session as admin user
    mockUseSession.mockReturnValue({
      data: { user: { email: 'admin@test.com' } },
      status: 'authenticated',
    } as any)

    const mockJobOpenings = [
      { id: '1', name: 'Software Engineer', created_at: new Date() },
      { id: '2', name: 'Product Manager', created_at: new Date() },
    ]

    const mockCandidates = [
      { 
        id: '1', 
        email: 'candidate1@test.com', 
        job_opening: { name: 'Software Engineer' },
        archived: false 
      },
      { 
        id: '2', 
        email: 'candidate2@test.com', 
        job_opening: { name: 'Product Manager' },
        archived: false 
      },
    ]

    // Mock successful API responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockJobOpenings,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCandidates,
      })

    render(<AdminDashboard />)

    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled()

    // Wait for data to load and verify content is displayed
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully without redirecting', async () => {
    // Mock session as admin user
    mockUseSession.mockReturnValue({
      data: { user: { email: 'admin@test.com' } },
      status: 'authenticated',
    } as any)

    // Mock network error
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<AdminDashboard />)

    // Should not redirect on network errors
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching job openings:', expect.any(Error))
    })

    expect(mockPush).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle malformed API responses without redirecting', async () => {
    // Mock session as admin user
    mockUseSession.mockReturnValue({
      data: { user: { email: 'admin@test.com' } },
      status: 'authenticated',
    } as any)

    // Mock API returning non-array data
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ error: 'Unexpected format' }), // Not an array
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ error: 'Unexpected format' }), // Not an array
      })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<AdminDashboard />)

    // Should not redirect on malformed responses
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching job openings:', 'Unexpected format')
    })

    expect(mockPush).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
