import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function isUserAdmin(email: string): Promise<boolean> {
  // Check if user is a superadmin from environment
  const superadmins = process.env.SUPERADMINS?.split(',').map(e => e.trim()) || []
  if (superadmins.includes(email)) {
    console.log(`✅ Superadmin verified from environment: ${email}`)
    return true
  }

  // Check if user exists in admin_users table and is active
  const adminUser = await prisma.adminUser.findUnique({
    where: { 
      email: email,
      is_active: true
    }
  })
  
  if (adminUser) {
    console.log(`✅ Admin user verified from database: ${email} (role: ${adminUser.role})`)
    return true
  }

  console.log(`❌ Access denied for non-admin user: ${email}`)
  return false
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }

  const isAdmin = await isUserAdmin(session.user.email)
  
  if (!isAdmin) {
    return { error: 'Forbidden', status: 403 }
  }

  return { session, isAdmin: true }
}