const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Exclude Puppeteer tests from main test suite
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/.*\\.puppeteer\\.test\\.(js|ts|tsx)$'
  ],
  // Ignore build artifacts that cause naming collisions
  modulePathIgnorePatterns: [
    '<rootDir>/.next/standalone/',
    '<rootDir>/src/generated/prisma/'
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
