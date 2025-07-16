import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './db'
import { sendMagicLinkEmail } from './email'

// Check if SMTP credentials are provided, otherwise default to Mailpit
const hasSmtpCredentials = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: hasSmtpCredentials ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      } : {
        host: 'localhost',
        port: 1025,
        auth: undefined,
      },
      from: process.env.SMTP_FROM || 'noreply@homework-tracker.local',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await sendMagicLinkEmail(email, url)
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: { job_opening: true }
        })

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.is_admin = dbUser.is_admin
          session.user.job_opening = dbUser.job_opening ? {
            ...dbUser.job_opening,
            created_at: dbUser.job_opening.created_at.toISOString()
          } : null
          session.user.started_at = dbUser.started_at?.toISOString() || null
          session.user.submitted_at = dbUser.submitted_at?.toISOString() || null
        }
      }
      return session
    },
    async signIn({ user }) {
      if (!user.email) return false

      // Check if user exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (!existingUser) {
        // Check if this is a superadmin
        const superadmins = process.env.SUPERADMINS?.split(',').map(email => email.trim()) || []
        const isAdmin = superadmins.includes(user.email)

        // Create user if they're a superadmin or if they were added as a candidate
        if (isAdmin) {
          await prisma.user.create({
            data: {
              email: user.email,
              is_admin: true
            }
          })
        } else {
          // Only allow sign in if user was already created as a candidate
          return false
        }
      }

      return true
    },
    async redirect({ url, baseUrl }) {
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // If it's the same origin, allow it
      if (new URL(url).origin === baseUrl) {
        return url
      }
      // After successful sign in, redirect to home (which will then redirect to appropriate page)
      return baseUrl
    }
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'database',
  },
}
