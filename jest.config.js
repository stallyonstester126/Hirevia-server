module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 30000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1' // Adjust according to your project structure
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/'] // Ignore these directories
}
