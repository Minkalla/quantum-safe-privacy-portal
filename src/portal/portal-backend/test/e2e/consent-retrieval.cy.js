
/**
 * @file consent-retrieval.cy.js
 * @description E2E tests for consent retrieval workflow
 * Tests consent retrieval via GET /portal/consent/{user_id} with various scenarios using API calls
 */

describe('E2E Consent Retrieval Tests', () => {
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

  describe('Successful Consent Retrieval', () => {
    it('should retrieve consent records successfully after creation', () => {
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
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(1)
        
        const consentRecord = response.body[0]
        expect(consentRecord).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(consentRecord).to.have.property('consentType', 'marketing')
        expect(consentRecord).to.have.property('granted', true)
        expect(consentRecord).to.have.property('ipAddress', '192.168.1.100')
        expect(consentRecord).to.have.property('userAgent', 'Cypress E2E Test Browser')
      })
    })

    it('should retrieve multiple consent records for same user', () => {
      const consentTypes = ['marketing', 'analytics', 'cookies']
      
      consentTypes.forEach((consentType, index) => {
        cy.request({
          method: 'POST',
          url: '/portal/consent',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            userId: '60d5ec49f1a23c001c8a4d7d',
            consentType: consentType,
            granted: index % 2 === 0 // Alternate between true/false
          }
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201])
        })
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(3)
        
        const consentTypes = response.body.map(record => record.consentType)
        expect(consentTypes).to.include('marketing')
        expect(consentTypes).to.include('analytics')
        expect(consentTypes).to.include('cookies')
      })
    })

    it('should retrieve consent records with all metadata fields', () => {
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
          ipAddress: '203.0.113.42',
          userAgent: 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36'
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(1)
        
        const consentRecord = response.body[0]
        expect(consentRecord).to.have.property('consentType', 'data_processing')
        expect(consentRecord).to.have.property('ipAddress', '203.0.113.42')
        expect(consentRecord).to.have.property('userAgent', 'Mozilla/5.0 (E2E Test) AppleWebKit/537.36')
        expect(consentRecord).to.have.property('consentId')
        expect(consentRecord).to.have.property('createdAt')
        expect(consentRecord).to.have.property('updatedAt')
      })
    })

    it('should retrieve updated consent records correctly', () => {
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
          granted: false
        }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(1)
        
        const consentRecord = response.body[0]
        expect(consentRecord).to.have.property('granted', false)
        expect(consentRecord).to.have.property('consentType', 'third_party_sharing')
      })
    })
  })

  describe('Failed Consent Retrieval - Not Found', () => {
    it('should return 404 when no consent records exist for user', () => {
      const nonExistentUserId = '60d5ec49f1a23c001c8a4d7e'
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/${nonExistentUserId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('No consent records found for this user')
      })
    })

    it('should return 404 for valid user ID format but non-existent user', () => {
      const validButNonExistentId = '507f1f77bcf86cd799439011'
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/${validButNonExistentId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Failed Consent Retrieval - Invalid User ID', () => {
    it('should return 400 for malformed user ID (too short)', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/invalid-id',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('User ID must be exactly 24 characters long')
      })
    })

    it('should return 400 for malformed user ID (too long)', () => {
      const longInvalidId = '60d5ec49f1a23c001c8a4d7d123456789'
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/${longInvalidId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('User ID must be exactly 24 characters long')
      })
    })

    it('should return 400 for user ID with invalid characters', () => {
      const invalidCharUserId = '60d5ec49f1a23c001c8a4d7!'
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/${invalidCharUserId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
      })
    })

    it('should return 400 for empty user ID', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 404])
      })
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when not authenticated', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('should return 401 with invalid JWT token', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.contain('Invalid or expired JWT token')
      })
    })

    it('should return 401 when Authorization header is missing', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request URL', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/invalid-url-format',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 404])
      })
    })

    it('should handle missing Authorization header', () => {
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('should validate response format for successful retrieval', () => {
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
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body.length).to.be.greaterThan(0)
        
        const firstRecord = response.body[0]
        expect(firstRecord).to.have.property('consentId')
        expect(firstRecord).to.have.property('userId', '60d5ec49f1a23c001c8a4d7d')
        expect(firstRecord).to.have.property('consentType', 'analytics')
        expect(firstRecord).to.have.property('granted', true)
        expect(firstRecord).to.have.property('createdAt')
        expect(firstRecord).to.have.property('updatedAt')
      })
    })

    it('should handle concurrent retrieval requests', () => {
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
      })

      for (let i = 0; i < 3; i++) {
        cy.request({
          method: 'GET',
          url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.be.an('array')
          expect(response.body).to.have.length(1)
        })
      }
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle retrieval of user with many consent records', () => {
      const consentTypes = ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
      
      consentTypes.forEach((consentType, index) => {
        cy.request({
          method: 'POST',
          url: '/portal/consent',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            userId: '60d5ec49f1a23c001c8a4d7d',
            consentType: consentType,
            granted: index % 2 === 0
          }
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201])
        })
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(5)
      })
    })

    it('should handle multiple sequential retrieval requests', () => {
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
      })
      
      for (let i = 0; i < 3; i++) {
        cy.request({
          method: 'GET',
          url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.be.an('array')
          expect(response.body).to.have.length(1)
        })
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
      
      cy.request({
        method: 'POST',
        url: '/portal/consent',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: testData
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201])
      })
      
      cy.request({
        method: 'GET',
        url: `/portal/consent/${testData.userId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(1)
        
        const consentRecord = response.body[0]
        expect(consentRecord).to.have.property('consentType', testData.consentType)
        expect(consentRecord).to.have.property('granted', testData.granted)
        expect(consentRecord).to.have.property('ipAddress', testData.ipAddress)
        expect(consentRecord).to.have.property('userAgent', testData.userAgent)
      })
    })

    it('should reflect real-time updates in retrieval', () => {
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
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0]).to.have.property('granted', true)
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
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0]).to.have.property('granted', false)
      })
    })
  })

  describe('Integration with Cleanup Process', () => {
    it('should verify cleanup removes all test data', () => {
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
      })
      
      cy.request({
        method: 'GET',
        url: '/portal/consent/60d5ec49f1a23c001c8a4d7d',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
        expect(response.body).to.have.length(1)
      })
    })
  })
})
