module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      // Only run files explicitly marked as unit tests
      testMatch: ['**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      }
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/integration'],
      testMatch: ['**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      }
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/e2e'],
      testMatch: ['**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest'
      }
    }
  ]
};
