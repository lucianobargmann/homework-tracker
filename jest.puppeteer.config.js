module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.puppeteer.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
};
