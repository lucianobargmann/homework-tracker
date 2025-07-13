import { authOptions } from '@/lib/auth'

describe('Auth Configuration', () => {
  it('should have email provider configured', () => {
    expect(authOptions.providers).toBeDefined()
    expect(authOptions.providers.length).toBeGreaterThan(0)
    expect(authOptions.providers[0].type).toBe('email')
  })

  it('should have correct callback URLs configured', () => {
    expect(authOptions.pages?.signIn).toBe('/auth/signin')
    expect(authOptions.pages?.verifyRequest).toBe('/auth/verify-request')
  })

  it('should use database session strategy', () => {
    expect(authOptions.session?.strategy).toBe('database')
  })
})
