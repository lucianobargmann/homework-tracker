import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
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

    const { github_link, prompts_used } = await request.json()

    if (!github_link || typeof github_link !== 'string') {
      return NextResponse.json({ error: 'GitHub link is required' }, { status: 400 })
    }

    if (!prompts_used || typeof prompts_used !== 'string') {
      return NextResponse.json({ error: 'Prompts used is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already submitted
    if (user.submitted_at) {
      return NextResponse.json({ error: 'Assignment already submitted' }, { status: 400 })
    }

    // Update user with submission data
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        github_link: github_link.trim(),
        prompts_used: prompts_used.trim(),
        submitted_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      submitted_at: updatedUser.submitted_at
    })
  } catch (error) {
    console.error('Error submitting assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
