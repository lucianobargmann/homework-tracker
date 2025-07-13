import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is NOT admin (candidates only)
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only set started_at if not already set
    if (!user.started_at) {
      await prisma.user.update({
        where: { id: user.id },
        data: { started_at: new Date() }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
