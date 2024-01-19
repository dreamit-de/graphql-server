module.exports = {
    roots: ['<rootDir>/tests'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,ts}'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^~/(.*)$': '<rootDir>/$1',
    },
    testEnvironment: 'node',
    reporters: [
        'default',
        [
            'jest-html-reporters',
            {
                publicPath: './test-report',
                filename: 'index.html',
                expand: true,
            },
        ],
    ],
}
