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

    const body = await request.json()

    // Prepare update data
    const updateData: any = {}

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase()
      
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: { 
          email,
          id: { not: resolvedParams.id }
        }
      })

      if (existingUser) {
        return NextResponse.json({ 
          error: 'Email is already taken by another user' 
        }, { status: 400 })
      }
      
      updateData.email = email
    }

    if (body.job_opening_id !== undefined) {
      if (body.job_opening_id === null || body.job_opening_id === '') {
        updateData.job_opening_id = null
      } else {
        // Verify job opening exists
        const jobOpening = await prisma.jobOpening.findUnique({
          where: { id: body.job_opening_id }
        })

        if (!jobOpening) {
          return NextResponse.json({ 
            error: 'Job opening not found' 
          }, { status: 400 })
        }

        updateData.job_opening_id = body.job_opening_id
      }
    }

    if (body.archived !== undefined) {
      updateData.archived = Boolean(body.archived)
    }

    const candidate = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { job_opening: true }
    })

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
