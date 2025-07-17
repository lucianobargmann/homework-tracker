import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { submissionAttempts, RATE_LIMIT_WINDOW, MAX_ATTEMPTS } from '@/lib/rate-limiter'
import { ScoringEngine } from '@/lib/scoring-engine'

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

    // Rate limiting check
    const userEmail = session.user.email
    const now = Date.now()
    const userAttempts = submissionAttempts.get(userEmail)

    if (userAttempts) {
      // Reset counter if window has passed
      if (now - userAttempts.lastAttempt > RATE_LIMIT_WINDOW) {
        submissionAttempts.set(userEmail, { count: 1, lastAttempt: now })
      } else {
        // Check if user has exceeded rate limit
        if (userAttempts.count >= MAX_ATTEMPTS) {
          return NextResponse.json({
            error: 'Too many submission attempts',
            message: `You have exceeded the maximum number of submission attempts (${MAX_ATTEMPTS}) within the last minute. Please wait before trying again.`
          }, { status: 429 })
        }
        // Increment attempt count
        submissionAttempts.set(userEmail, { count: userAttempts.count + 1, lastAttempt: now })
      }
    } else {
      // First attempt for this user
      submissionAttempts.set(userEmail, { count: 1, lastAttempt: now })
    }

    const { github_link, prompts_used } = await request.json()

    // Enhanced input validation
    if (!github_link || typeof github_link !== 'string' || github_link.trim().length === 0) {
      return NextResponse.json({
        error: 'GitHub link is required',
        message: 'Please provide a valid GitHub repository link.'
      }, { status: 400 })
    }

    if (!prompts_used || typeof prompts_used !== 'string' || prompts_used.trim().length === 0) {
      return NextResponse.json({
        error: 'Prompts used is required',
        message: 'Please describe the prompts you used during the assignment.'
      }, { status: 400 })
    }

    // Validate GitHub link format (basic validation)
    const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/
    if (!githubUrlPattern.test(github_link.trim())) {
      return NextResponse.json({
        error: 'Invalid GitHub link format',
        message: 'Please provide a valid GitHub repository URL (e.g., https://github.com/username/repository).'
      }, { status: 400 })
    }

    // Validate input lengths to prevent abuse
    if (github_link.trim().length > 500) {
      return NextResponse.json({
        error: 'GitHub link too long',
        message: 'GitHub link must be less than 500 characters.'
      }, { status: 400 })
    }

    if (prompts_used.trim().length > 10000) {
      return NextResponse.json({
        error: 'Prompts description too long',
        message: 'Prompts description must be less than 10,000 characters.'
      }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has started the assignment
    if (!user.started_at) {
      return NextResponse.json({
        error: 'Assignment not started',
        message: 'You must start the assignment before submitting. Please go to the welcome page first.'
      }, { status: 400 })
    }

    // Check if already submitted - Enhanced validation
    if (user.submitted_at) {
      return NextResponse.json({
        error: 'Assignment already submitted',
        submitted_at: user.submitted_at,
        message: 'This assignment was already submitted. Multiple submissions are not allowed.'
      }, { status: 409 }) // 409 Conflict is more appropriate than 400
    }

    // Use atomic update with conditional check to prevent race conditions
    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
          submitted_at: null // Only update if submitted_at is still null
        },
        data: {
          github_link: github_link.trim(),
          prompts_used: prompts_used.trim(),
          submitted_at: new Date()
        }
      })

      // Trigger automatic scoring in background (non-blocking)
      try {
        const scoringEngine = new ScoringEngine()
        const scoringResult = await scoringEngine.scoreRepository(github_link.trim(), prompts_used.trim())
        
        // Save scoring result to database
        await prisma.scoringResult.create({
          data: {
            user_id: user.id,
            github_url: github_link.trim(),
            total_score: scoringResult.totalScore,
            max_score: scoringResult.maxScore,
            percentage: scoringResult.percentage,
            report_data: JSON.stringify(scoringResult)
          }
        })
        
        console.log(`✅ Automatic scoring completed for user ${user.email}: ${scoringResult.percentage.toFixed(1)}%`)
      } catch (scoringError) {
        // Log error but don't fail the submission
        console.error('❌ Error during automatic scoring:', scoringError)
        console.log('📝 Submission still successful, scoring can be done manually later')
      }

      return NextResponse.json({
        success: true,
        submitted_at: updatedUser.submitted_at,
        message: 'Assignment submitted successfully'
      })
    } catch (updateError: any) {
      // Check if the update failed because the record was not found (already submitted)
      if (updateError.code === 'P2025') {
        // Re-fetch user to get current submission status
        const currentUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { submitted_at: true }
        })

        if (currentUser?.submitted_at) {
          return NextResponse.json({
            error: 'Assignment already submitted',
            submitted_at: currentUser.submitted_at,
            message: 'This assignment was already submitted while processing your request. Multiple submissions are not allowed.'
          }, { status: 409 })
        }
      }

      // Re-throw if it's a different error
      throw updateError
    }

  } catch (error) {
    console.error('Error submitting assignment:', error)

    // Get session for logging (may be null if error occurred before session check)
    let sessionForLogging = null
    try {
      sessionForLogging = await getServerSession(authOptions)
    } catch (sessionError) {
      // Ignore session errors in error handler
    }

    // Log additional details for debugging malicious attempts
    console.error('Submission attempt details:', {
      email: sessionForLogging?.user?.email || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'An error occurred while processing your submission. Please try again or contact support.'
    }, { status: 500 })
  }
}
