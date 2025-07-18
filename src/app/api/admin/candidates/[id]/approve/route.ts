import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendApprovalEmail } from '@/lib/email'

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
      where: { id },
      include: { job_opening: true }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (candidate.is_admin) {
      return NextResponse.json({ error: 'Cannot approve admin users' }, { status: 400 })
    }

    // Check if candidate has submitted their assignment
    if (!candidate.submitted_at) {
      return NextResponse.json({ 
        error: 'Candidate has not submitted their assignment yet' 
      }, { status: 400 })
    }

    // Check if already approved or currently approving
    if (candidate.approval_status === 'approved') {
      return NextResponse.json({ 
        error: 'Candidate is already approved' 
      }, { status: 400 })
    }

    if (candidate.approval_status === 'approving') {
      return NextResponse.json({ 
        error: 'Candidate approval is already in progress' 
      }, { status: 400 })
    }

    // Set status to "approving"
    await prisma.user.update({
      where: { id },
      data: {
        approval_status: 'approving'
      }
    })

    // Start the 5-minute delay process in the background
    setTimeout(async () => {
      try {
        console.log(`⏰ Starting 5-minute approval process for candidate: ${candidate.email}`)
        
        // Wait 5 minutes (300,000 milliseconds)
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000))
        
        // Check if the approval was cancelled during the wait
        const currentCandidate = await prisma.user.findUnique({
          where: { id }
        })
        
        if (!currentCandidate || currentCandidate.approval_status !== 'approving') {
          console.log(`❌ Approval was cancelled for candidate: ${candidate.email}`)
          return
        }
        
        console.log(`📧 Sending approval email to: ${candidate.email}`)
        
        // Send approval email
        await sendApprovalEmail(candidate.email, candidate.email.split('@')[0])
        
        // Update status to "approved"
        await prisma.user.update({
          where: { id },
          data: {
            approval_status: 'approved',
            approved_at: new Date()
          }
        })
        
        console.log(`✅ Candidate approved successfully: ${candidate.email}`)
      } catch (error) {
        console.error(`❌ Error in approval process for ${candidate.email}:`, error)
        
        // Reset status on error
        await prisma.user.update({
          where: { id },
          data: {
            approval_status: null
          }
        }).catch(resetError => {
          console.error('❌ Error resetting approval status:', resetError)
        })
      }
    }, 0) // Start immediately but run in background

    return NextResponse.json({
      message: 'Approval process started. Email will be sent in 5 minutes.',
      status: 'approving'
    })
  } catch (error) {
    console.error('Error starting approval process:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}