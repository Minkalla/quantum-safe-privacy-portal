
/**
 * @file consent-creation.cy.js
 * @description E2E tests for consent creation workflow
 * Tests consent creation via POST /portal/consent with various scenarios
 */

describe('E2E Consent Creation Tests', () => {
  beforeEach(() => {
    cy.task('setupE2EDatabase')
    
    cy.visit('/test/e2e/mock-frontend.html')
    cy.login('e2e-test@example.com', 'TestPassword123!')
    
    cy.get('#statusText').should('contain', 'Authenticated')
  })

  afterEach(() => {
    cy.task('cleanupE2EDatabase')
  })

  describe('Successful Consent Creation', () => {
    it('should create marketing consent successfully', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      cy.get('[data-cy="consent-ip-address"]').type('192.168.1.100')
      cy.get('[data-cy="consent-user-agent"]').type('Cypress E2E Test Browser')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      cy.get('[data-cy="consent-create-response"]').should('contain', '200')
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'consentId')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'userId')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'consentType')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'granted')
    })

    it('should create consent for all consent types', () => {
      const consentTypes = ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
      
      consentTypes.forEach((consentType, index) => {
        if (index > 0) {
          cy.get('[data-cy="consent-create-response"]').should('not.be.visible')
        }
        
        cy.createConsent({
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: consentType,
          granted: true
        })
        
        cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
        cy.get('[data-cy="consent-create-response"]').should('contain', consentType)
        
        cy.get('[data-cy="consent-create-response"]').then($el => {
          $el.hide()
        })
      })
    })

    it('should create consent with minimal required fields', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('analytics')
      cy.get('[data-cy="consent-granted"]').select('false')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      cy.get('[data-cy="consent-create-response"]').should('contain', '"granted": false')
    })

    it('should update existing consent when granted status changes', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'cookies',
        granted: true
      })
      
      cy.get('[data-cy="consent-create-response"]').should('contain', '"granted": true')
      
      cy.get('[data-cy="consent-granted"]').select('false')
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      cy.get('[data-cy="consent-create-response"]').should('contain', '"granted": false')
    })

    it('should handle IPv6 addresses correctly', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('data_processing')
      cy.get('[data-cy="consent-granted"]').select('true')
      cy.get('[data-cy="consent-ip-address"]').type('::ffff:127.0.0.1')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      cy.get('[data-cy="consent-create-response"]').should('contain', '::ffff:127.0.0.1')
    })
  })

  describe('Failed Consent Creation - Missing Fields', () => {
    it('should fail when userId is missing', () => {
      cy.get('[data-cy="consent-user-id"]').clear()
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '400')
    })

    it('should fail when consentType is not selected', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-granted"]').select('true')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-type"]').should('have.attr', 'required')
    })

    it('should fail when granted is not selected', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('marketing')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-granted"]').should('have.attr', 'required')
    })
  })

  describe('Failed Consent Creation - Invalid Data', () => {
    it('should fail with invalid userId format', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('invalid-id')
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '400')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'User ID must be exactly 24 characters long')
    })

    it('should fail with invalid IP address format', () => {
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      cy.get('[data-cy="consent-ip-address"]').type('invalid-ip-address')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '400')
    })

    it('should fail with user agent exceeding maximum length', () => {
      const longUserAgent = 'a'.repeat(501)
      
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      cy.get('[data-cy="consent-user-agent"]').type(longUserAgent)
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('be.visible')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '400')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'User agent must not exceed 500 characters')
    })
  })

  describe('Duplicate Consent Prevention', () => {
    it('should prevent duplicate consent with same granted status', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'third_party_sharing',
        granted: true
      })
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '409')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent record already exists with the same granted status')
    })

    it('should allow consent update when granted status changes', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'analytics',
        granted: true
      })
      
      cy.get('[data-cy="consent-granted"]').select('false')
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      cy.get('[data-cy="consent-create-response"]').should('contain', '"granted": false')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should fail when not authenticated', () => {
      cy.logout()
      
      cy.get('[data-cy="consent-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-type"]').select('marketing')
      cy.get('[data-cy="consent-granted"]').select('true')
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('windowAlert')
      })
      cy.get('@windowAlert').should('have.been.calledWith', 'Please login first!')
    })

    it('should fail with invalid JWT token', () => {
      cy.intercept('POST', '**/portal/consent', {
        statusCode: 401,
        body: { statusCode: 401, message: 'Invalid or expired JWT token' }
      }).as('invalidTokenRequest')
      
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.wait('@invalidTokenRequest')
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '401')
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Invalid or expired JWT token')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '**/portal/consent', { forceNetworkError: true }).as('networkErrorRequest')
      
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.wait('@networkErrorRequest')
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Network Error')
    })

    it('should handle server errors (500) gracefully', () => {
      cy.intercept('POST', '**/portal/consent', {
        statusCode: 500,
        body: { message: 'Internal Server Error' }
      }).as('serverErrorRequest')
      
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.wait('@serverErrorRequest')
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Creation Failed')
      cy.get('[data-cy="consent-create-response"]').should('contain', '500')
    })

    it('should validate response format', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.get('[data-cy="consent-create-response"]').invoke('text').then((responseText) => {
        const lines = responseText.split('\n')
        const jsonResponse = JSON.parse(lines.slice(1).join('\n'))
        
        expect(jsonResponse).to.have.property('consentId')
        expect(jsonResponse).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(jsonResponse).to.have.property('consentType', 'marketing')
        expect(jsonResponse).to.have.property('granted', true)
        expect(jsonResponse).to.have.property('createdAt')
        expect(jsonResponse).to.have.property('updatedAt')
      })
    })
  })

  describe('Cleanup and Data Integrity', () => {
    it('should clean up created consent after test', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      
    })

    it('should maintain data consistency across multiple operations', () => {
      const consentTypes = ['marketing', 'analytics']
      
      consentTypes.forEach(consentType => {
        cy.createConsent({
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: consentType,
          granted: true
        })
        
        cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
        
        cy.get('[data-cy="consent-create-response"]').then($el => {
          $el.hide()
        })
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 2 record(s)')
    })
  })
})
