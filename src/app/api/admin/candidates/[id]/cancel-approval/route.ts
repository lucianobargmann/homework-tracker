import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params

    // Find the candidate
    const candidate = await prisma.user.findUnique({
      where: { id }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (candidate.approval_status !== 'approving') {
      return NextResponse.json({ 
        error: 'Candidate is not in approving status' 
      }, { status: 400 })
    }

    // Reset approval status to null
    await prisma.user.update({
      where: { id },
      data: {
        approval_status: null
      }
    })

    console.log(`❌ Approval cancelled for candidate: ${candidate.email}`)

    return NextResponse.json({
      message: 'Approval cancelled successfully',
      status: 'cancelled'
    })
  } catch (error) {
    console.error('Error cancelling approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}