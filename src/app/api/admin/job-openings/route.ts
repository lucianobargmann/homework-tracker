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

    const jobOpenings = await prisma.jobOpening.findMany({
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(jobOpenings)
  } catch (error) {
    console.error('Error fetching job openings:', error)
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

    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const jobOpening = await prisma.jobOpening.create({
      data: { name: name.trim() }
    })

    return NextResponse.json(jobOpening)
  } catch (error) {
    console.error('Error creating job opening:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
