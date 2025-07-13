import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { archived } = await request.json()

    if (typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'Archived must be a boolean' }, { status: 400 })
    }

    const candidate = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { archived },
      include: { job_opening: true }
    })

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
