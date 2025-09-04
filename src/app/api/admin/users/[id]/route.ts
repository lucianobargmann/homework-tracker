import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET single admin user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const user = await prisma.adminUser.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update admin user
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { email, name, role, is_active } = body

    // Check if user exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existingUser.email) {
      const duplicateUser = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase() }
      })
      
      if (duplicateUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }

    const user = await prisma.adminUser.update({
      where: { id: params.id },
      data: {
        ...(email && { email: email.toLowerCase() }),
        ...(name !== undefined && { name }),
        ...(role && { role }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date(),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE admin user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Check if user exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-deletion
    if (existingUser.email === session.user.email) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await prisma.adminUser.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}