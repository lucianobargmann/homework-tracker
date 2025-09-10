#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncAdminUsers() {
  try {
    console.log('Starting admin user sync...')
    
    // Get all admin users from AdminUser table
    const adminUsers = await prisma.adminUser.findMany({
      where: { is_active: true }
    })
    
    console.log(`Found ${adminUsers.length} admin users to sync`)
    
    for (const admin of adminUsers) {
      console.log(`Syncing admin user: ${admin.email}`)
      
      // Create or update in User table
      await prisma.user.upsert({
        where: { email: admin.email },
        update: { is_admin: true },
        create: {
          email: admin.email,
          is_admin: true,
        },
      })
      
      console.log(`✓ Synced ${admin.email}`)
    }
    
    console.log('Admin user sync completed successfully!')
  } catch (error) {
    console.error('Error syncing admin users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncAdminUsers()