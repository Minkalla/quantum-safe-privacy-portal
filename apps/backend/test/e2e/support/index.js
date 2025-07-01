//
//
//

import './commands'


Cypress.on('uncaught:exception', (err, runnable) => {
  return false
})

Cypress.Commands.add('login', (email = 'e2e-test@example.com', password = 'TestPassword123!', rememberMe = false) => {
  cy.visit('/test/e2e/mock-frontend.html')
  cy.get('[data-cy="login-email"]').clear().type(email)
  cy.get('[data-cy="login-password"]').clear().type(password)
  
  if (rememberMe) {
    cy.get('[data-cy="login-remember"]').check()
  }
  
  cy.get('[data-cy="login-submit"]').click()
  cy.get('[data-cy="login-response"]').should('be.visible')
})

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="logout-button"]').click()
  cy.get('[data-cy="login-response"]').should('contain', 'Logged out successfully')
})

Cypress.Commands.add('createConsent', (consentData = {}) => {
  const defaultData = {
    userId: '60d5ec49f1a23c001c8a4d7d',
    consentType: 'marketing',
    granted: true,
    ipAddress: '192.168.1.100',
    userAgent: 'Cypress E2E Test Browser'
  }
  
  const data = { ...defaultData, ...consentData }
  
  cy.get('[data-cy="consent-user-id"]').clear().type(data.userId)
  cy.get('[data-cy="consent-type"]').select(data.consentType)
  cy.get('[data-cy="consent-granted"]').select(data.granted.toString())
  
  if (data.ipAddress) {
    cy.get('[data-cy="consent-ip-address"]').clear().type(data.ipAddress)
  }
  
  if (data.userAgent) {
    cy.get('[data-cy="consent-user-agent"]').clear().type(data.userAgent)
  }
  
  cy.get('[data-cy="consent-create-submit"]').click()
  cy.get('[data-cy="consent-create-response"]').should('be.visible')
})

Cypress.Commands.add('retrieveConsent', (userId = '60d5ec49f1a23c001c8a4d7d') => {
  cy.get('[data-cy="retrieve-user-id"]').clear().type(userId)
  cy.get('[data-cy="consent-retrieve-submit"]').click()
  cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
})
