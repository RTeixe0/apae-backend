export default {
    testEnvironment: "node",

    transform: {},

    moduleFileExtensions: ["js", "json"],

    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],

    transformIgnorePatterns: ["node_modules/(?!.*)"],

    collectCoverageFrom: [
        "controllers/**/*.js",
        "routes/**/*.js",
        "middlewares/**/*.js",
        "services/**/*.js",
        "!**/*.spec.js",
        "!**/*.test.js",
    ],

    clearMocks: true,
    resetMocks: true,

    verbose: true,
};
