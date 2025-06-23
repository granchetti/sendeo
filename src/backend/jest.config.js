module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/stacks'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
