import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      is_admin: boolean
      job_opening?: {
        id: string
        name: string
        created_at: string
      } | null
      started_at?: string | null
      submitted_at?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    is_admin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    is_admin: boolean
  }
}
