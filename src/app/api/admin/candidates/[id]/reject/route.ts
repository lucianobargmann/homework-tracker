import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendRejectionEmail } from '@/lib/email'

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
    console.log(`🔐 Checking admin access for reject: ${session.user.email}`)
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
        console.log(`❌ Access denied for non-admin user: ${session.user.email}`)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      console.log(`✅ Admin user verified from database: ${session.user.email} (role: ${adminUser.role})`)
    } else {
      console.log(`✅ Superadmin verified from environment: ${session.user.email}`)
    }

    const { id } = await context.params

    // Find the candidate
    const candidate = await prisma.user.findUnique({
      where: { id },
      include: { job_opening: true }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (candidate.is_admin) {
      return NextResponse.json({ error: 'Cannot reject admin users' }, { status: 400 })
    }

    // Check if candidate has submitted their assignment
    if (!candidate.submitted_at) {
      return NextResponse.json({ 
        error: 'Candidate has not submitted their assignment yet' 
      }, { status: 400 })
    }

    // Check if already rejected or approved
    if (candidate.approval_status === 'rejected') {
      return NextResponse.json({ 
        error: 'Candidate is already rejected' 
      }, { status: 400 })
    }

    if (candidate.approval_status === 'approved') {
      return NextResponse.json({ 
        error: 'Cannot reject an approved candidate' 
      }, { status: 400 })
    }

    try {
      console.log(`📧 Sending rejection email to: ${candidate.email}`)
      
      // Send rejection email
      await sendRejectionEmail(candidate.email, candidate.email.split('@')[0])
      
      // Update status to "rejected"
      await prisma.user.update({
        where: { id },
        data: {
          approval_status: 'rejected'
        }
      })
      
      console.log(`✅ Candidate rejected successfully: ${candidate.email}`)
      
      return NextResponse.json({
        message: 'Candidate rejected and email sent successfully.',
        status: 'rejected'
      })
    } catch (error) {
      console.error(`❌ Error in rejection process for ${candidate.email}:`, error)
      throw error
    }
  } catch (error) {
    console.error('Error rejecting candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}