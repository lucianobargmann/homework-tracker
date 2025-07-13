import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

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
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/welcome', '/assignment', '/submit']
}
