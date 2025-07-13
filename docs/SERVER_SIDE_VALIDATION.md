# Server-Side Validation Against Malicious Submissions

## Overview

This document outlines the comprehensive server-side validation implemented to prevent malicious users from bypassing the client-side flow and submitting assignments through direct API calls using tools like Postman, curl, or custom scripts.

## Problem Statement

Without proper server-side validation, malicious users could:
- Submit assignments multiple times
- Bypass the assignment start requirement
- Submit invalid or malicious data
- Overwhelm the server with rapid requests
- Access the submission endpoint without proper authentication

## Implemented Security Measures

### 1. Authentication & Authorization

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 13-23)

```typescript
// Verify user session
const session = await getServerSession(authOptions)
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Ensure only candidates (not admins) can submit
const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
if (superadmins.includes(session.user.email)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Protection**: Prevents unauthenticated access and admin users from submitting assignments.

### 2. Rate Limiting

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 6-48)

```typescript
// In-memory rate limiter
export const submissionAttempts = new Map<string, { count: number; lastAttempt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_ATTEMPTS = 5 // Max 5 attempts per minute per user

// Rate limiting logic prevents spam submissions
if (userAttempts.count >= MAX_ATTEMPTS) {
  return NextResponse.json({ 
    error: 'Too many submission attempts',
    message: `You have exceeded the maximum number of submission attempts (${MAX_ATTEMPTS}) within the last minute.`
  }, { status: 429 })
}
```

**Protection**: Prevents spam submissions and brute force attempts.

### 3. Input Validation & Sanitization

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 52-89)

```typescript
// Enhanced input validation
if (!github_link || typeof github_link !== 'string' || github_link.trim().length === 0) {
  return NextResponse.json({ 
    error: 'GitHub link is required',
    message: 'Please provide a valid GitHub repository link.'
  }, { status: 400 })
}

// GitHub URL format validation
const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/
if (!githubUrlPattern.test(github_link.trim())) {
  return NextResponse.json({ 
    error: 'Invalid GitHub link format',
    message: 'Please provide a valid GitHub repository URL.'
  }, { status: 400 })
}

// Input length validation
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
```

**Protection**: Validates input format, prevents injection attacks, and limits input size.

### 4. Assignment State Validation

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 100-115)

```typescript
// Check if user has started the assignment
if (!user.started_at) {
  return NextResponse.json({ 
    error: 'Assignment not started', 
    message: 'You must start the assignment before submitting. Please go to the welcome page first.'
  }, { status: 400 })
}

// Check if already submitted
if (user.submitted_at) {
  return NextResponse.json({ 
    error: 'Assignment already submitted', 
    submitted_at: user.submitted_at,
    message: 'This assignment was already submitted. Multiple submissions are not allowed.'
  }, { status: 409 })
}
```

**Protection**: Ensures proper workflow and prevents multiple submissions.

### 5. Atomic Database Operations

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 118-156)

```typescript
// Atomic update with conditional check to prevent race conditions
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

// Handle race condition if record was already updated
if (updateError.code === 'P2025') {
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { submitted_at: true }
  })
  
  if (currentUser?.submitted_at) {
    return NextResponse.json({ 
      error: 'Assignment already submitted',
      message: 'This assignment was already submitted while processing your request.'
    }, { status: 409 })
  }
}
```

**Protection**: Prevents race conditions where multiple concurrent requests could result in duplicate submissions.

### 6. Middleware-Level Protection

**Location**: `/src/lib/middleware.ts` (lines 37-53)

```typescript
// Check if user has already submitted and redirect accordingly
if (token.email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: { submitted_at: true }
    })

    // Redirect already-submitted users away from assignment pages
    if (user?.submitted_at && ['/welcome', '/assignment'].includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/submit', request.url))
    }
  } catch (error) {
    console.error('Error checking submission status in middleware:', error)
  }
}
```

**Protection**: Prevents already-submitted candidates from accessing assignment pages again.

### 7. Security Logging

**Location**: `/src/app/api/candidate/submit/route.ts` (lines 158-181)

```typescript
// Detailed logging for security monitoring
console.error('Submission attempt details:', {
  email: sessionForLogging?.user?.email || 'unknown',
  timestamp: new Date().toISOString(),
  userAgent: request.headers.get('user-agent'),
  ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
})
```

**Protection**: Enables monitoring and detection of malicious attempts.

## Testing

### Automated Tests

Comprehensive test suite at `/src/__tests__/api/submit.test.ts` covers:
- ✅ Authentication validation
- ✅ Input validation
- ✅ Assignment state checks
- ✅ Rate limiting
- ✅ Race condition handling
- ✅ Error handling

### Manual Testing Script

Run the malicious submission test script:

```bash
node test-malicious-submission.js
```

This script simulates various attack vectors that malicious users might attempt.

## Security Response Codes

| Status Code | Meaning | When Triggered |
|-------------|---------|----------------|
| 401 | Unauthorized | No valid session |
| 403 | Forbidden | Admin trying to submit |
| 400 | Bad Request | Invalid input, not started |
| 409 | Conflict | Already submitted |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected errors |

## Deployment Considerations

1. **Rate Limiting**: Current implementation uses in-memory storage. For production with multiple servers, consider Redis or database-backed rate limiting.

2. **Logging**: Implement proper log aggregation and monitoring for security events.

3. **HTTPS**: Ensure all communication is encrypted in production.

4. **CSRF Protection**: NextAuth.js provides built-in CSRF protection.

5. **Input Sanitization**: All inputs are trimmed and validated before database storage.

## Conclusion

The implemented server-side validation provides comprehensive protection against malicious submission attempts while maintaining a smooth user experience for legitimate users. The multi-layered approach ensures that even if one validation layer is bypassed, others will catch and prevent malicious activity.
