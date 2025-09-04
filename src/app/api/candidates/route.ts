import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function validateBearerToken(authorization: string | null): Promise<boolean> {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return false
  }

  const token = authorization.slice(7) // Remove "Bearer " prefix

  try {
    const bearerToken = await prisma.bearerToken.findUnique({
      where: { 
        token,
        is_active: true
      }
    })

    if (bearerToken) {
      // Update last_used timestamp
      await prisma.bearerToken.update({
        where: { id: bearerToken.id },
        data: { last_used: new Date() }
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Error validating bearer token:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    
    const isValidToken = await validateBearerToken(authorization)
    if (!isValidToken) {
      return NextResponse.json({ error: 'Invalid or missing bearer token' }, { status: 401 })
    }

    const body = await request.json()
    const { email, jobOpeningName } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!jobOpeningName || typeof jobOpeningName !== 'string') {
      return NextResponse.json({ error: 'Job opening name is required' }, { status: 400 })
    }

    // Find the job opening by name
    const jobOpening = await prisma.jobOpening.findFirst({
      where: { name: jobOpeningName.trim() }
    })

    if (!jobOpening) {
      return NextResponse.json({ error: 'Job opening not found' }, { status: 404 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      // If user exists with the same job opening, return error
      if (existingUser.job_opening_id === jobOpening.id) {
        return NextResponse.json({ error: 'User already exists in this job opening' }, { status: 400 })
      }
      
      // If user exists but has a different job opening, update their job opening
      const updatedUser = await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: {
          job_opening_id: jobOpening.id,
          // Reset their progress when assigned to new job opening
          started_at: null,
          submitted_at: null,
          github_link: null,
          prompts_used: null,
          archived: false,
          approval_status: null,
          approved_at: null
        },
        include: { job_opening: true }
      })
      
      return NextResponse.json({
        message: 'Candidate updated successfully',
        candidate: updatedUser
      })
    }

    // Create new candidate
    const candidate = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        is_admin: false,
        job_opening_id: jobOpening.id
      },
      include: { job_opening: true }
    })

    return NextResponse.json({
      message: 'Candidate created successfully',
      candidate
    })
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}