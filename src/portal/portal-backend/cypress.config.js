const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'test/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'test/e2e/support/index.js',
    pluginsFile: 'test/e2e/plugins/index.js',
    videosFolder: 'test/e2e/videos',
    screenshotsFolder: 'test/e2e/screenshots',
    fixturesFolder: 'test/e2e/fixtures',
    video: true,
    screenshot: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 720
  }
})
