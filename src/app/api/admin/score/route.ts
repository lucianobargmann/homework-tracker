// API endpoint for scoring candidate submissions
// File: /src/app/api/admin/score/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@/generated/prisma'
import { ScoringEngine } from '@/lib/scoring-engine'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, githubUrl, promptsText, allowRescore = false } = body

    if (!userId || !githubUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, githubUrl' 
      }, { status: 400 })
    }

    // Validate GitHub URL
    if (!githubUrl.includes('github.com')) {
      return NextResponse.json({ 
        error: 'Invalid GitHub URL' 
      }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { job_opening: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize scoring engine
    const scoringEngine = new ScoringEngine()

    console.log(`🏆 Starting scoring process for user: ${user.email} (${userId})`)
    console.log(`🔗 Repository URL: ${githubUrl}`)
    console.log(`🔄 Allow rescore: ${allowRescore}`)
    
    // Check if scoring already exists
    const existingScore = await prisma.scoringResult.findFirst({
      where: {
        user_id: userId,
        github_url: githubUrl
      }
    })

    if (existingScore && !allowRescore) {
      console.log(`⚠️ Repository already scored, blocking rescore`)
      return NextResponse.json({
        error: 'Repository already scored. Use allowRescore=true to rescore.',
        existingScore: {
          id: existingScore.id,
          totalScore: existingScore.total_score,
          maxScore: existingScore.max_score,
          percentage: existingScore.percentage,
          createdAt: existingScore.created_at
        }
      }, { status: 409 })
    }

    if (existingScore && allowRescore) {
      console.log(`🔄 Rescoring existing submission (ID: ${existingScore.id})`)
    }

    // Run the scoring
    console.log(`🚀 Initiating scoring engine...`)
    const scoringReport = await scoringEngine.scoreRepository(
      githubUrl, 
      promptsText || user.prompts_used || undefined
    )
    console.log(`✅ Scoring engine completed successfully`)

    // Save or update the scoring results
    console.log(`💾 Saving scoring results to database...`)
    const scoringResult = existingScore && allowRescore 
      ? await prisma.scoringResult.update({
          where: { id: existingScore.id },
          data: {
            total_score: scoringReport.totalScore,
            max_score: scoringReport.maxScore,
            percentage: scoringReport.percentage,
            report_data: JSON.stringify(scoringReport),
            updated_at: new Date()
          }
        })
      : await prisma.scoringResult.create({
          data: {
            user_id: userId,
            github_url: githubUrl,
            total_score: scoringReport.totalScore,
            max_score: scoringReport.maxScore,
            percentage: scoringReport.percentage,
            report_data: JSON.stringify(scoringReport),
            created_at: new Date(),
            updated_at: new Date()
          }
        })
    
    console.log(`✅ Scoring results saved successfully (ID: ${scoringResult.id})`)
    console.log(`🏆 Final score: ${scoringReport.totalScore}/${scoringReport.maxScore} (${scoringReport.percentage.toFixed(1)}%)`)

    return NextResponse.json({
      success: true,
      scoringResult: {
        id: scoringResult.id,
        totalScore: scoringReport.totalScore,
        maxScore: scoringReport.maxScore,
        percentage: scoringReport.percentage,
        categories: scoringReport.categories,
        recommendations: scoringReport.recommendations,
        timestamp: scoringReport.timestamp
      }
    })

  } catch (error) {
    console.error('❌ Error scoring submission:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing userId parameter' 
      }, { status: 400 })
    }

    // Get scoring results for the user
    const scoringResults = await prisma.scoringResult.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            job_opening: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    const formattedResults = scoringResults.map(result => ({
      id: result.id,
      githubUrl: result.github_url,
      totalScore: result.total_score,
      maxScore: result.max_score,
      percentage: result.percentage,
      createdAt: result.created_at,
      user: result.user,
      report: result.report_data ? JSON.parse(result.report_data) : null
    }))

    return NextResponse.json({
      success: true,
      results: formattedResults
    })

  } catch (error) {
    console.error('Error fetching scoring results:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}