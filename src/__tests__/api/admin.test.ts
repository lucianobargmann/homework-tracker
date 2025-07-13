/**
 * @jest-environment node
 */

describe('Admin API Tests', () => {
  it('should be properly configured', () => {
    expect(process.env.NODE_ENV).toBeDefined()
  })
})


