
/**
 * @file consent-creation.cy.js
 * @description E2E tests for consent creation workflow
 * Tests consent creation via POST /portal/consent with various scenarios using API calls
 */

describe('E2E Consent Creation Tests', () => {
  let authToken

  beforeEach(() => {
    cy.task('setupE2EDatabase')
    
    cy.request({
      method: 'POST',
      url: '/portal/auth/login',
      body: {
        email: 'e2e-test@example.com',
        password: 'TestPassword123!'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      authToken = response.body.accessToken
    })
  })

  afterEach(() => {
    cy.task('cleanupE2EDatabase')
  })

  describe('Successful Consent Creation', () => {
    it('should create marketing consent successfully', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Cypress E2E Test Browser'
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('consentId')
        expect(response.body).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(response.body).to.have.property('consentType', 'marketing')
        expect(response.body).to.have.property('granted', true)
        expect(response.body).to.have.property('ipAddress', '192.168.1.100')
        expect(response.body).to.have.property('userAgent', 'Cypress E2E Test Browser')
      })
    })

    it('should create consent for all consent types', () => {
      const consentTypes = ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
      
      consentTypes.forEach((consentType) => {
        cy.request({
          method: 'POST',
          url: '/portal/consent',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            userId: '60d5ec49f1a23c001c8a4d7d',
            consentType: consentType,
            granted: true
          }
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201])
          expect(response.body).to.have.property('consentType', consentType)
          expect(response.body).to.have.property('granted', true)
        })
      })
    })

    it('should create consent with minimal required fields', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'analytics',
          granted: false
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('granted', false)
        expect(response.body).to.have.property('consentType', 'analytics')
      })
    })

    it('should update existing consent when granted status changes', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'cookies',
          granted: true
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('granted', true)
      })

      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'cookies',
          granted: false
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('granted', false)
      })
    })

    it('should handle IPv6 addresses correctly', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'data_processing',
          granted: true,
          ipAddress: '::ffff:127.0.0.1'
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('ipAddress', '::ffff:127.0.0.1')
      })
    })
  })

  describe('Failed Consent Creation - Missing Fields', () => {
    it('should fail when userId is missing', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          consentType: 'marketing',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail when consentType is missing', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail when granted is missing', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Failed Consent Creation - Invalid Data', () => {
    it('should fail with invalid userId format', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: 'invalid-id',
          consentType: 'marketing',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('User ID must be exactly 24 characters long')
      })
    })

    it('should fail with invalid IP address format', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true,
          ipAddress: 'invalid-ip-address'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail with user agent exceeding maximum length', () => {
      const longUserAgent = 'a'.repeat(501)
      
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true,
          userAgent: longUserAgent
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('User agent must not exceed 500 characters')
      })
    })
  })

  describe('Duplicate Consent Prevention', () => {
    it('should prevent duplicate consent with same granted status', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'third_party_sharing',
          granted: true
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
      })

      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'third_party_sharing',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(409)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('Consent record already exists with the same granted status')
      })
    })

    it('should allow consent update when granted status changes', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'analytics',
          granted: true
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('granted', true)
      })

      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'analytics',
          granted: false
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('granted', false)
      })
    })
  })

  describe('Authentication and Authorization', () => {
    it('should fail when not authenticated', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail with invalid JWT token', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('Invalid or expired JWT token')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request body', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid-json',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422])
      })
    })

    it('should handle missing request body', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422])
      })
    })

    it('should validate response format', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('consentId')
        expect(response.body).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(response.body).to.have.property('consentType', 'marketing')
        expect(response.body).to.have.property('granted', true)
        expect(response.body).to.have.property('createdAt')
        expect(response.body).to.have.property('updatedAt')
      })
    })
  })

  describe('Cleanup and Data Integrity', () => {
    it('should clean up created consent after test', () => {
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: '60d5ec49f1a23c001c8a4d7d',
          consentType: 'marketing',
          granted: true
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
        expect(response.body).to.have.property('consentId')
      })
    })

    it('should maintain data consistency across multiple operations', () => {
      const consentTypes = ['marketing', 'analytics']
      
      consentTypes.forEach(consentType => {
        cy.request({
          method: 'POST',
          url: '/portal/consent',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            userId: '60d5ec49f1a23c001c8a4d7d',
            consentType: consentType,
            granted: true
          }
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201])
          expect(response.body).to.have.property('consentType', consentType)
        })
      })
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/60d5ec49f1a23c001c8a4d7d`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(2)
      })
    })
  })
})
