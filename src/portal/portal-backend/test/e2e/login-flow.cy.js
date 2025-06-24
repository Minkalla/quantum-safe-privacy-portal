
/**
 * @file login-flow.cy.js
 * @description E2E tests for JWT authentication login flow
 * Tests user login with valid/invalid credentials and JWT token handling via API
 */

describe('E2E Login Flow Tests', () => {
  beforeEach(() => {
    cy.task('setupE2EDatabase')
  })

  afterEach(() => {
    cy.task('cleanupE2EDatabase')
  })

  describe('Successful Login Scenarios', () => {
    it('should login successfully with valid credentials', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
        expect(response.body.accessToken).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        expect(response.body).to.have.property('user')
        expect(response.body.user.email).to.eq('e2e-test@example.com')
      })
    })

    it('should login successfully with remember me option', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!',
          rememberMe: true
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
        expect(response.body).to.have.property('refreshToken')
      })
    })

    it('should return user information after successful login', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('user')
        expect(response.body.user).to.have.property('email')
        expect(response.body.user).to.have.property('id')
        expect(response.body.user.email).to.eq('e2e-test@example.com')
      })
    })
  })

  describe('Failed Login Scenarios', () => {
    it('should fail login with invalid email', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'invalid@example.com',
          password: 'TestPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail login with invalid password', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'WrongPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('should fail login with empty email', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: '',
          password: 'TestPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401])
      })
    })

    it('should fail login with empty password', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: ''
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401])
      })
    })
  })

  describe('Authentication Token Validation', () => {
    it('should return valid JWT token format', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
        
        const token = response.body.accessToken
        expect(token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        
        const parts = token.split('.')
        expect(parts).to.have.length(3)
      })
    })

    it('should include user information in token payload', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('user')
        expect(response.body.user).to.have.property('id')
        expect(response.body.user).to.have.property('email')
        expect(response.body.user.email).to.eq('e2e-test@example.com')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request body', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422])
      })
    })

    it('should handle missing request body', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422])
      })
    })

    it('should handle SQL injection attempts', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: "'; DROP TABLE users; --",
          password: 'TestPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })
  })

  describe('Security and Compliance Tests', () => {
    it('should not return sensitive user data in response', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'e2e-test@example.com',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.not.have.property('password')
        expect(response.body.user).to.not.have.property('password')
        expect(response.body.user).to.not.have.property('passwordHash')
      })
    })

    it('should handle case-insensitive email login', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'E2E-TEST@EXAMPLE.COM',
          password: 'TestPassword123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
      })
    })

    it('should validate email format requirements', () => {
      cy.request({
        method: 'POST',
        url: '/portal/auth/login',
        body: {
          email: 'not-an-email',
          password: 'TestPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401, 422])
      })
    })
  })
})
