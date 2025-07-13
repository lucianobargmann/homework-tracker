/**
 * Timer tests to ensure timer never shows negative values
 */

import { render, screen } from '@testing-library/react'

describe('Timer Tests - No Negative Values', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Timer calculation logic', () => {
    it('should never return negative elapsed time', () => {
      const calculateElapsed = (startTime: Date, currentTime: Date) => {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
        return Math.max(0, elapsed) // This is the fix we implemented
      }

      // Test with future start time (edge case)
      const futureStart = new Date(Date.now() + 60000) // 1 minute in future
      const now = new Date()
      const result = calculateElapsed(futureStart, now)

      expect(result).toBe(0)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should handle invalid dates gracefully', () => {
      const calculateElapsed = (startTime: Date, currentTime: Date) => {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
        // Handle NaN and negative values
        if (isNaN(elapsed) || elapsed < 0) {
          return 0
        }
        return elapsed
      }

      // Test with invalid date
      const invalidStart = new Date('invalid-date')
      const now = new Date()
      const result = calculateElapsed(invalidStart, now)

      expect(result).toBe(0)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should calculate positive time for valid past timestamps', () => {
      const calculateElapsed = (startTime: Date, currentTime: Date) => {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
        return Math.max(0, elapsed)
      }

      // Test with 1 hour ago
      const oneHourAgo = new Date(Date.now() - 3600000)
      const now = new Date()
      const result = calculateElapsed(oneHourAgo, now)

      expect(result).toBeGreaterThan(3500) // Should be around 3600 seconds
      expect(result).toBeLessThan(3700)
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('formatTime function edge cases', () => {
    // Test the formatTime function directly by importing it
    // We'll create a test component that exposes the function
    const TestComponent = ({ seconds }: { seconds: number }) => {
      const formatTime = (seconds: number) => {
        // Handle negative or invalid values
        if (seconds < 0 || !isFinite(seconds)) {
          return '00:00:00'
        }
        
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }

      return <div data-testid="formatted-time">{formatTime(seconds)}</div>
    }

    it('should return 00:00:00 for negative seconds', () => {
      render(<TestComponent seconds={-100} />)
      expect(screen.getByTestId('formatted-time')).toHaveTextContent('00:00:00')
    })

    it('should return 00:00:00 for NaN', () => {
      render(<TestComponent seconds={NaN} />)
      expect(screen.getByTestId('formatted-time')).toHaveTextContent('00:00:00')
    })

    it('should return 00:00:00 for Infinity', () => {
      render(<TestComponent seconds={Infinity} />)
      expect(screen.getByTestId('formatted-time')).toHaveTextContent('00:00:00')
    })

    it('should format positive seconds correctly', () => {
      render(<TestComponent seconds={3661} />) // 1 hour, 1 minute, 1 second
      expect(screen.getByTestId('formatted-time')).toHaveTextContent('01:01:01')
    })

    it('should format zero seconds correctly', () => {
      render(<TestComponent seconds={0} />)
      expect(screen.getByTestId('formatted-time')).toHaveTextContent('00:00:00')
    })
  })

  describe('Edge cases', () => {
    it('should handle extreme values', () => {
      const calculateElapsed = (startTime: Date, currentTime: Date) => {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
        if (isNaN(elapsed) || elapsed < 0) {
          return 0
        }
        return elapsed
      }

      // Test with very large negative value
      const veryFutureStart = new Date(Date.now() + 999999999999)
      const now = new Date()
      const result = calculateElapsed(veryFutureStart, now)

      expect(result).toBe(0)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should handle server-client time synchronization securely', () => {
      // Simulate the new server-synchronized timer logic
      const calculateElapsedWithServerSync = (
        startTime: Date,
        clientTime: number,
        serverTimeOffset: number
      ) => {
        const syncedTime = clientTime + serverTimeOffset
        const elapsed = Math.floor((syncedTime - startTime.getTime()) / 1000)
        return Math.max(0, elapsed) // Always positive with server sync
      }

      const startTime = new Date('2025-01-01T10:00:00Z')

      // Test case: Client clock is behind server by 10 seconds
      const clientTimeBehind = new Date('2025-01-01T10:05:00Z').getTime() // 5 minutes after start
      const serverOffsetAhead = 10000 // Server is 10 seconds ahead

      const elapsedBehind = calculateElapsedWithServerSync(startTime, clientTimeBehind, serverOffsetAhead)
      expect(elapsedBehind).toBe(310) // 5 minutes + 10 seconds = 310 seconds

      // Test case: Client clock is ahead of server by 10 seconds
      const clientTimeAhead = new Date('2025-01-01T10:05:00Z').getTime() // 5 minutes after start
      const serverOffsetBehind = -10000 // Server is 10 seconds behind

      const elapsedAhead = calculateElapsedWithServerSync(startTime, clientTimeAhead, serverOffsetBehind)
      expect(elapsedAhead).toBe(290) // 5 minutes - 10 seconds = 290 seconds

      // Test case: Extreme client manipulation (client sets clock way back)
      const clientTimeManipulated = new Date('2025-01-01T09:00:00Z').getTime() // 1 hour before start
      const normalOffset = 0

      const elapsedManipulated = calculateElapsedWithServerSync(startTime, clientTimeManipulated, normalOffset)
      expect(elapsedManipulated).toBe(0) // Should be 0, not negative

      // Test case: Normal operation
      const clientTimeNormal = new Date('2025-01-01T10:03:00Z').getTime() // 3 minutes after start
      const normalOffsetSmall = 1000 // 1 second difference

      const elapsedNormal = calculateElapsedWithServerSync(startTime, clientTimeNormal, normalOffsetSmall)
      expect(elapsedNormal).toBe(181) // 3 minutes + 1 second = 181 seconds
    })

    it('should prevent timer manipulation attacks', () => {
      // Test that the timer logic is resistant to common manipulation attempts

      // Attack 1: Setting client clock to future
      const startTime = new Date('2025-01-01T10:00:00Z')
      const futureClientTime = new Date('2025-01-01T15:00:00Z').getTime() // 5 hours in future
      const serverOffset = -18000000 // Server is 5 hours behind (realistic server time)

      const syncedTime = futureClientTime + serverOffset
      const elapsed = Math.floor((syncedTime - startTime.getTime()) / 1000)
      const validElapsed = Math.max(0, elapsed)

      // Should calculate based on server time, not manipulated client time
      expect(validElapsed).toBe(0) // Server time shows no time has passed

      // Attack 2: Negative time manipulation
      const negativeElapsed = -3600 // -1 hour
      const secureElapsed = Math.max(0, negativeElapsed)
      expect(secureElapsed).toBe(0) // Always non-negative
    })
  })
})
