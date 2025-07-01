//
//


/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {

  on('task', {
    async setupE2EDatabase() {
      const { setupE2EEnvironment } = require('../e2e-setup.ts')
      
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
      const { cleanupE2EEnvironment } = require('../e2e-setup.ts')
      
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
