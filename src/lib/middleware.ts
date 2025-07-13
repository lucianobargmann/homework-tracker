import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Check if user is admin
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (!token.email || !superadmins.includes(token.email)) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  // Check if accessing candidate routes
  if (['/welcome', '/assignment', '/submit'].includes(request.nextUrl.pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Check if user is NOT admin (candidates only)
    const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
    if (token.email && superadmins.includes(token.email)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // For candidates, check if they have already submitted
    if (token.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: token.email },
          select: { submitted_at: true }
        })

        // If user has submitted and is trying to access welcome or assignment pages,
        // redirect them to the submit page to see their results
        if (user?.submitted_at && ['/welcome', '/assignment'].includes(request.nextUrl.pathname)) {
          return NextResponse.redirect(new URL('/submit', request.url))
        }
      } catch (error) {
        console.error('Error checking submission status in middleware:', error)
        // Continue with normal flow if database check fails
      } finally {
        await prisma.$disconnect()
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/welcome', '/assignment', '/submit']
}
