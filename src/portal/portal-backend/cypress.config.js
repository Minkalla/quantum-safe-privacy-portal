const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'test/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'test/e2e/support/index.js',
    videosFolder: 'test/e2e/videos',
    screenshotsFolder: 'test/e2e/screenshots',
    fixturesFolder: 'test/e2e/fixtures',
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 30000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      return config
    }
  }
})
