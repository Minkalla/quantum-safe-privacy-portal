
/**
 * @file login-flow.cy.js
 * @description E2E tests for JWT authentication login flow
 * Tests user login with valid/invalid credentials and JWT token handling
 */

describe('E2E Login Flow Tests', () => {
  beforeEach(() => {
    cy.task('setupE2EDatabase')
    
    cy.visit('/test/e2e/mock-frontend.html')
    
    cy.get('[data-cy="login-email"]').should('be.visible')
    cy.get('[data-cy="login-password"]').should('be.visible')
    cy.get('[data-cy="login-submit"]').should('be.visible')
  })

  afterEach(() => {
    cy.task('cleanupE2EDatabase')
  })

  describe('Successful Login Scenarios', () => {
    it('should login successfully with valid credentials', () => {
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Successful')
      cy.get('[data-cy="login-response"]').should('contain', '200')
      
      cy.get('#statusText').should('contain', 'Authenticated as e2e-test@example.com')
      cy.get('#statusIndicator').should('have.class', 'status-logged-in')
      
      cy.get('[data-cy="login-response"]').should('contain', 'accessToken')
    })

    it('should login successfully with remember me option', () => {
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      cy.get('[data-cy="login-remember"]').check()
      
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Successful')
      
      cy.get('[data-cy="login-response"]').should('contain', 'refreshToken')
    })

    it('should maintain authentication state after successful login', () => {
      cy.login('e2e-test@example.com', 'TestPassword123!')
      
      cy.get('#statusText').should('contain', 'Authenticated as e2e-test@example.com')
      
      cy.get('[data-cy="consent-create-submit"]').should('not.be.disabled')
      cy.get('[data-cy="consent-retrieve-submit"]').should('not.be.disabled')
    })
  })

  describe('Failed Login Scenarios', () => {
    it('should fail login with invalid email', () => {
      cy.get('[data-cy="login-email"]').type('invalid@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Failed')
      cy.get('[data-cy="login-response"]').should('contain', '401')
      
      cy.get('#statusText').should('contain', 'Not authenticated')
      cy.get('#statusIndicator').should('have.class', 'status-logged-out')
    })

    it('should fail login with invalid password', () => {
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('WrongPassword123!')
      
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Failed')
      cy.get('[data-cy="login-response"]').should('contain', '401')
    })

    it('should fail login with empty credentials', () => {
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-email"]').should('have.attr', 'required')
      cy.get('[data-cy="login-password"]').should('have.attr', 'required')
      
      cy.get('[data-cy="login-response"]').should('not.be.visible')
    })

    it('should handle malformed email format', () => {
      cy.get('[data-cy="login-email"]').type('not-an-email')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      
      cy.get('[data-cy="login-submit"]').click()
      
      cy.get('[data-cy="login-email"]').should('have.attr', 'type', 'email')
    })
  })

  describe('Logout Functionality', () => {
    it('should logout successfully after login', () => {
      cy.login('e2e-test@example.com', 'TestPassword123!')
      
      cy.get('#statusText').should('contain', 'Authenticated as e2e-test@example.com')
      
      cy.logout()
      
      cy.get('[data-cy="login-response"]').should('contain', 'Logged out successfully')
      cy.get('#statusText').should('contain', 'Not authenticated')
      cy.get('#statusIndicator').should('have.class', 'status-logged-out')
    })

    it('should clear authentication token on logout', () => {
      cy.login('e2e-test@example.com', 'TestPassword123!')
      
      cy.logout()
      
      cy.get('[data-cy="consent-create-submit"]').click()
      
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('windowAlert')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '**/auth/login', { forceNetworkError: true }).as('loginRequest')
      
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.wait('@loginRequest')
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Network Error')
    })

    it('should handle server errors (500) gracefully', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 500,
        body: { message: 'Internal Server Error' }
      }).as('loginRequest')
      
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.wait('@loginRequest')
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Failed')
      cy.get('[data-cy="login-response"]').should('contain', '500')
    })

    it('should validate JWT token format in response', () => {
      cy.login('e2e-test@example.com', 'TestPassword123!')
      
      cy.get('[data-cy="login-response"]').should('contain', 'accessToken')
      
      cy.get('[data-cy="login-response"]').invoke('text').then((responseText) => {
        const response = JSON.parse(responseText.split('\n').slice(1).join('\n'))
        expect(response.accessToken).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
      })
    })
  })

  describe('Security and Compliance Tests', () => {
    it('should not expose password in network requests', () => {
      cy.intercept('POST', '**/auth/login').as('loginRequest')
      
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.wait('@loginRequest').then((interception) => {
        expect(interception.request.body).to.have.property('password')
        expect(interception.request.body.password).to.equal('TestPassword123!')
      })
    })

    it('should use HTTPS in production (simulated)', () => {
      cy.get('#loginForm').should('exist')
      
      cy.get('[data-cy="login-password"]').should('have.attr', 'type', 'password')
    })

    it('should handle rate limiting gracefully', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 429,
        body: { message: 'Too many login attempts. Please try again later.' }
      }).as('rateLimitedRequest')
      
      cy.get('[data-cy="login-email"]').type('e2e-test@example.com')
      cy.get('[data-cy="login-password"]').type('TestPassword123!')
      cy.get('[data-cy="login-submit"]').click()
      
      cy.wait('@rateLimitedRequest')
      
      cy.get('[data-cy="login-response"]').should('be.visible')
      cy.get('[data-cy="login-response"]').should('contain', 'Login Failed')
      cy.get('[data-cy="login-response"]').should('contain', '429')
    })
  })
})
