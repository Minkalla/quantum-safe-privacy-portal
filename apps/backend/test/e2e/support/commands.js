//


function generateTestData() {
  return {
    userId: '60d5ec49f1a23c001c8a4d7d',
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    consentTypes: ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateTestData
  }
}
