import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
    }

    const token = await prisma.bearerToken.update({
      where: { id: params.id },
      data: { is_active }
    })

    return NextResponse.json(token)
  } catch (error) {
    console.error('Error updating bearer token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!superadmins.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.bearerToken.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Token deleted successfully' })
  } catch (error) {
    console.error('Error deleting bearer token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}