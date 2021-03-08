module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  testEnvironment: 'node',
  watchPathIgnorePatterns: [
    'test/tmp'
  ]
}
