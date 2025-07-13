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

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const candidates = await prisma.user.findMany({
      where: { is_admin: false },
      include: { job_opening: true },
      orderBy: { email: 'asc' }
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

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
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
