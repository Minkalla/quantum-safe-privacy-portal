module.exports = {
  e2e: {
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
      on('task', {
        async setupE2EDatabase() {
          const { setupE2EEnvironment } = require('./test/e2e/e2e-setup.js')
          
          try {
            const result = await setupE2EEnvironment()
            console.log('E2E database setup completed:', result)
            return result
          } catch (error) {
            console.error('E2E database setup failed:', error)
            throw error
          }
        },

        async cleanupE2EDatabase() {
          const { cleanupE2EEnvironment } = require('./test/e2e/e2e-setup.js')
          
          try {
            await cleanupE2EEnvironment()
            console.log('E2E database cleanup completed')
            return null
          } catch (error) {
            console.error('E2E database cleanup failed:', error)
            throw error
          }
        },

        log(message) {
          console.log(message)
          return null
        }
      })

      return config
    }
  }
}
