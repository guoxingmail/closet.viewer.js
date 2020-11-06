module.exports = {
    preset: 'ts-jest',

    globalSetup: '<rootDir>/ci/jestSetup.js',
    globalTeardown: '<rootDir>/ci/jestTeardown.js',
    testEnvironment: '<rootDir>/ci/jestEnvironment.js',
    setupFilesAfterEnv: ['<rootDir>/ci/jestAfterEnvSetup.js', "jest-allure/dist/setup"],
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'test-reports',
            outputName: 'report.xml',
        }],
    ],
};