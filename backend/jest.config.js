module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: ['controllers/**/*.js', 'middleware/**/*.js', 'utils/**/*.js'],
  coverageThreshold: {
    global: { statements: 60, branches: 50, functions: 60, lines: 60 },
  },
};
