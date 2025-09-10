import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET all admin users
export async function GET() {
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

    const users = await prisma.adminUser.findMany({
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new admin user
export async function POST(request: Request) {
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
    const { email, name, role } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Create admin user in AdminUser table
    const adminUser = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'admin',
        created_by: session.user.email,
      },
    })

    // Also create/update in User table for authentication
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { is_admin: true },
      create: {
        email: email.toLowerCase(),
        is_admin: true,
      },
    })

    return NextResponse.json(adminUser)
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}