export default {
    packageManager: "npm",
    testRunner: "jest",
    mutate: [
        "controllers/paymentController.js",
        "controllers/validationController.js",
        "controllers/ticketsController.js",
        "controllers/eventsController.js",
    ],
    jest: {
        projectType: "custom",
        configFile: "jest.config.js",
        config: {
            testEnvironment: "node",
        },
    },
    testRunnerNodeArgs: ["--experimental-vm-modules"],
    concurrency: 1,
    coverageAnalysis: "off",
    thresholds: {
        break: 0,
    },
    reporters: ["clear-text", "html"],
    htmlReporter: {
        fileName: "reports/mutation/mutation-report.html",
    },
};
