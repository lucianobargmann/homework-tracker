/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth')

// Mock the Prisma client
jest.mock('../../lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Import after mocking
import { POST } from '../../app/api/candidate/submit/route'
import { submissionAttempts } from '../../lib/rate-limiter'
import { prisma } from '../../lib/db'

const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>
const mockUpdate = prisma.user.update as jest.MockedFunction<typeof prisma.user.update>

describe('/api/candidate/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SUPERADMINS = 'admin@example.com'

    // Clear the rate limiter between tests
    submissionAttempts.clear()

    // Reset mocks
    mockFindUnique.mockReset()
    mockUpdate.mockReset()
  })

  const mockSession = {
    user: { email: 'candidate@example.com' }
  }

  const mockUser = {
    id: 'user-123',
    email: 'candidate@example.com',
    started_at: new Date('2023-01-01T10:00:00Z'),
    submitted_at: null,
    github_link: null,
    prompts_used: null
  }

  const validPayload = {
    github_link: 'https://github.com/user/repo',
    prompts_used: 'I used Claude to help with the implementation'
  }

  it('should reject unauthenticated requests', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should reject admin users', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@example.com' }
    })

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should reject invalid GitHub links', async () => {
    mockGetServerSession.mockResolvedValue(mockSession)

    const invalidPayloads = [
      { github_link: '', prompts_used: 'test' },
      { github_link: 'not-a-url', prompts_used: 'test' },
      { github_link: 'https://gitlab.com/user/repo', prompts_used: 'test' },
      { github_link: 'https://github.com/', prompts_used: 'test' }
    ]

    for (const payload of invalidPayloads) {
      const request = new NextRequest('http://localhost/api/candidate/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/GitHub link|Invalid GitHub link format/)
    }
  })

  it('should reject users who have not started the assignment', async () => {
    mockGetServerSession.mockResolvedValue(mockSession)
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      started_at: null
    })

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Assignment not started')
    expect(data.message).toContain('must start the assignment')
  })

  it('should reject already submitted assignments', async () => {
    const submittedAt = new Date('2023-01-01T12:00:00Z')
    mockGetServerSession.mockResolvedValue(mockSession)
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      submitted_at: submittedAt
    })

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Assignment already submitted')
    expect(data.submitted_at).toEqual(submittedAt.toISOString())
    expect(data.message).toContain('Multiple submissions are not allowed')
  })

  it('should successfully submit valid assignment', async () => {
    const submittedAt = new Date('2023-01-01T12:00:00Z')
    mockGetServerSession.mockResolvedValue(mockSession)
    mockFindUnique.mockResolvedValue(mockUser)
    mockUpdate.mockResolvedValue({
      ...mockUser,
      github_link: validPayload.github_link,
      prompts_used: validPayload.prompts_used,
      submitted_at: submittedAt
    })

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.submitted_at).toEqual(submittedAt.toISOString())
    expect(data.message).toBe('Assignment submitted successfully')

    // Verify atomic update was called with correct conditions
    expect(mockUpdate).toHaveBeenCalledWith({
      where: {
        id: mockUser.id,
        submitted_at: null
      },
      data: {
        github_link: validPayload.github_link.trim(),
        prompts_used: validPayload.prompts_used.trim(),
        submitted_at: expect.any(Date)
      }
    })
  })

  it('should handle race condition when assignment is submitted concurrently', async () => {
    const submittedAt = new Date('2023-01-01T12:00:00Z')
    mockGetServerSession.mockResolvedValue(mockSession)
    mockFindUnique.mockResolvedValueOnce(mockUser)

    // Simulate Prisma error for record not found (race condition)
    const prismaError = new Error('Record not found')
    ;(prismaError as any).code = 'P2025'
    mockUpdate.mockRejectedValue(prismaError)

    // Mock the re-fetch to show the user has already submitted
    mockFindUnique.mockResolvedValueOnce({
      submitted_at: submittedAt
    })

    const request = new NextRequest('http://localhost/api/candidate/submit', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Assignment already submitted')
    expect(data.message).toContain('while processing your request')
  })

  it('should enforce rate limiting', async () => {
    mockGetServerSession.mockResolvedValue(mockSession)
    mockFindUnique.mockResolvedValue(mockUser)

    // Make multiple requests quickly
    const requests = Array.from({ length: 6 }, () =>
      new NextRequest('http://localhost/api/candidate/submit', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      })
    )

    const responses = await Promise.all(requests.map(req => POST(req)))
    const lastResponse = responses[responses.length - 1]
    const lastData = await lastResponse.json()

    expect(lastResponse.status).toBe(429)
    expect(lastData.error).toBe('Too many submission attempts')
    expect(lastData.message).toContain('exceeded the maximum number')
  })
})
