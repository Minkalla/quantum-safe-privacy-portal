
/**
 * @file consent-retrieval.cy.js
 * @description E2E tests for consent retrieval workflow
 * Tests consent retrieval via GET /portal/consent/{user_id} with various scenarios
 */

describe('E2E Consent Retrieval Tests', () => {
  beforeEach(() => {
    cy.task('setupE2EDatabase')
    
    cy.visit('/test/e2e/mock-frontend.html')
    cy.login('e2e-test@example.com', 'TestPassword123!')
    
    cy.get('#statusText').should('contain', 'Authenticated')
  })

  afterEach(() => {
    cy.task('cleanupE2EDatabase')
  })

  describe('Successful Consent Retrieval', () => {
    it('should retrieve consent records successfully after creation', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Cypress E2E Test Browser'
      })
      
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Records Retrieved')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '200')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 1 record(s)')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'marketing')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '"granted": true')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '60d5ec49f1a23c001c8a4d7d')
    })

    it('should retrieve multiple consent records for same user', () => {
      const consentTypes = ['marketing', 'analytics', 'cookies']
      
      consentTypes.forEach((consentType, index) => {
        cy.createConsent({
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: consentType,
          granted: index % 2 === 0 // Alternate between true/false
        })
        
        cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
        
        cy.get('[data-cy="consent-create-response"]').then($el => {
          $el.hide()
        })
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 3 record(s)')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'marketing')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'analytics')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'cookies')
    })

    it('should retrieve consent records with all metadata fields', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'data_processing',
        granted: true,
        ipAddress: '203.0.113.42',
        userAgent: 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36'
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'data_processing')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '203.0.113.42')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'consentId')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'createdAt')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'updatedAt')
    })

    it('should retrieve updated consent records correctly', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'third_party_sharing',
        granted: true
      })
      
      cy.get('[data-cy="consent-granted"]').select('false')
      cy.get('[data-cy="consent-create-submit"]').click()
      cy.get('[data-cy="consent-create-response"]').should('contain', 'Consent Created/Updated')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 1 record(s)')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '"granted": false')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'third_party_sharing')
    })
  })

  describe('Failed Consent Retrieval - Not Found', () => {
    it('should return 404 when no consent records exist for user', () => {
      const nonExistentUserId = '60d5ec49f1a23c001c8a4d7e'
      
      cy.get('[data-cy="retrieve-user-id"]').clear().type(nonExistentUserId)
      cy.get('[data-cy="consent-retrieve-submit"]').click()
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '404')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'No consent records found for this user')
    })

    it('should return 404 for valid user ID format but non-existent user', () => {
      const validButNonExistentId = '507f1f77bcf86cd799439011'
      
      cy.retrieveConsent(validButNonExistentId)
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '404')
    })
  })

  describe('Failed Consent Retrieval - Invalid User ID', () => {
    it('should return 400 for malformed user ID (too short)', () => {
      cy.get('[data-cy="retrieve-user-id"]').clear().type('invalid-id')
      cy.get('[data-cy="consent-retrieve-submit"]').click()
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '400')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'User ID must be exactly 24 characters long')
    })

    it('should return 400 for malformed user ID (too long)', () => {
      const longInvalidId = '60d5ec49f1a23c001c8a4d7d123456789'
      
      cy.retrieveConsent(longInvalidId)
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '400')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'User ID must be exactly 24 characters long')
    })

    it('should return 400 for user ID with invalid characters', () => {
      const invalidCharUserId = '60d5ec49f1a23c001c8a4d7!'
      
      cy.retrieveConsent(invalidCharUserId)
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '400')
    })

    it('should test invalid user ID using mock frontend button', () => {
      cy.get('[data-cy="consent-retrieve-invalid"]').click()
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Invalid User ID Test')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '400')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when not authenticated', () => {
      cy.logout()
      
      cy.get('[data-cy="retrieve-user-id"]').clear().type('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-retrieve-submit"]').click()
      
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('windowAlert')
      })
      cy.get('@windowAlert').should('have.been.calledWith', 'Please login first!')
    })

    it('should return 401 with invalid JWT token', () => {
      cy.intercept('GET', '**/portal/consent/*', {
        statusCode: 401,
        body: { statusCode: 401, message: 'Invalid or expired JWT token' }
      }).as('invalidTokenRequest')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.wait('@invalidTokenRequest')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '401')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Invalid or expired JWT token')
    })

    it('should return 401 when Authorization header is missing', () => {
      cy.intercept('GET', '**/portal/consent/*', {
        statusCode: 401,
        body: { statusCode: 401, message: 'Authorization header is missing' }
      }).as('missingAuthRequest')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.wait('@missingAuthRequest')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Authorization header is missing')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '**/portal/consent/*', { forceNetworkError: true }).as('networkErrorRequest')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.wait('@networkErrorRequest')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Network Error')
    })

    it('should handle server errors (500) gracefully', () => {
      cy.intercept('GET', '**/portal/consent/*', {
        statusCode: 500,
        body: { message: 'Internal Server Error' }
      }).as('serverErrorRequest')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.wait('@serverErrorRequest')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Consent Retrieval Failed')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '500')
    })

    it('should handle malformed JSON responses', () => {
      cy.intercept('GET', '**/portal/consent/*', {
        statusCode: 200,
        body: 'invalid json response'
      }).as('malformedJsonRequest')
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.wait('@malformedJsonRequest')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
    })

    it('should validate response format for successful retrieval', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'analytics',
        granted: true
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').invoke('text').then((responseText) => {
        const lines = responseText.split('\n')
        const jsonResponse = JSON.parse(lines.slice(2).join('\n'))
        
        expect(Array.isArray(jsonResponse)).to.be.true
        expect(jsonResponse.length).to.be.greaterThan(0)
        
        const firstRecord = jsonResponse[0]
        expect(firstRecord).to.have.property('consentId')
        expect(firstRecord).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(firstRecord).to.have.property('consentType', 'analytics')
        expect(firstRecord).to.have.property('granted', true)
        expect(firstRecord).to.have.property('createdAt')
        expect(firstRecord).to.have.property('updatedAt')
      })
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle retrieval of user with many consent records', () => {
      const consentTypes = ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
      
      consentTypes.forEach((consentType, index) => {
        cy.createConsent({
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: consentType,
          granted: index % 2 === 0
        })
        
        cy.get('[data-cy="consent-create-response"]').then($el => {
          $el.hide()
        })
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 5 record(s)')
      
      cy.get('[data-cy="consent-retrieve-response"]').should('be.visible')
    })

    it('should handle concurrent retrieval requests gracefully', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      for (let i = 0; i < 3; i++) {
        cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
        cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 1 record(s)')
        
        cy.wait(100)
      }
    })
  })

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across create-retrieve cycle', () => {
      const testData = {
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'data_processing',
        granted: true,
        ipAddress: '10.0.0.1',
        userAgent: 'Test Agent v1.0'
      }
      
      cy.createConsent(testData)
      
      cy.retrieveConsent(testData.userId)
      
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', testData.consentType)
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', `"granted": ${testData.granted}`)
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', testData.ipAddress)
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', testData.userAgent)
    })

    it('should reflect real-time updates in retrieval', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'cookies',
        granted: true
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '"granted": true')
      
      cy.get('[data-cy="consent-granted"]').select('false')
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', '"granted": false')
    })
  })

  describe('Integration with Cleanup Process', () => {
    it('should verify cleanup removes all test data', () => {
      cy.createConsent({
        userId: '60d5ec49f1a23c001c8a4d7d',
        consentType: 'marketing',
        granted: true
      })
      
      cy.retrieveConsent('60d5ec49f1a23c001c8a4d7d')
      cy.get('[data-cy="consent-retrieve-response"]').should('contain', 'Found 1 record(s)')
      
    })
  })
})
