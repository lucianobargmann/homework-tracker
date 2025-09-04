import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (superadmin from .env OR admin user from database)
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    const isSuper = superadmins.includes(session.user.email)
    
    if (!isSuper) {
      // Check if user exists in admin_users table and is active
      const adminUser = await prisma.adminUser.findUnique({
        where: { 
          email: session.user.email,
          is_active: true
        }
      })
      
      if (!adminUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const candidates = await prisma.user.findMany({
      where: { is_admin: false },
      include: { 
        job_opening: true,
        scoring_results: {
          orderBy: { created_at: 'desc' },
          take: 1 // Only get the most recent scoring result
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (superadmin from .env OR admin user from database)
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    const isSuper = superadmins.includes(session.user.email)
    
    if (!isSuper) {
      // Check if user exists in admin_users table and is active
      const adminUser = await prisma.adminUser.findUnique({
        where: { 
          email: session.user.email,
          is_active: true
        }
      })
      
      if (!adminUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { email, job_opening_id } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!job_opening_id || typeof job_opening_id !== 'string') {
      return NextResponse.json({ error: 'Job opening ID is required' }, { status: 400 })
    }

    // Check if job opening exists
    const jobOpening = await prisma.jobOpening.findUnique({
      where: { id: job_opening_id }
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
      if (existingUser.job_opening_id === job_opening_id) {
        return NextResponse.json({ error: 'User already exists in this job opening' }, { status: 400 })
      }
      
      // If user exists but has a different job opening, update their job opening
      const updatedUser = await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: {
          job_opening_id,
          // Reset their progress when assigned to new job opening
          started_at: null,
          submitted_at: null,
          github_link: null,
          prompts_used: null,
          archived: false
        },
        include: { job_opening: true }
      })
      
      return NextResponse.json(updatedUser)
    }

    const candidate = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        is_admin: false,
        job_opening_id
      },
      include: { job_opening: true }
    })

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
