import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

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

    const tokens = await prisma.bearerToken.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        token: true,
        created_by: true,
        created_at: true,
        last_used: true,
        is_active: true
      }
    })

    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Error fetching bearer tokens:', error)
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
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')

    const bearerToken = await prisma.bearerToken.create({
      data: {
        name: name.trim(),
        token,
        created_by: session.user.email
      }
    })

    return NextResponse.json(bearerToken)
  } catch (error) {
    console.error('Error creating bearer token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}