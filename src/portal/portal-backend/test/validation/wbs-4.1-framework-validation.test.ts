import { existsSync } from 'fs';
import { join } from 'path';

describe('WBS 4.1 Testing Framework Validation', () => {
  const baseDir = '/home/ubuntu/repos/quantum-safe-privacy-portal/src/portal/portal-backend';
  
  describe('Test Directory Structure Created', () => {
    it('should have created all PQC test directories', () => {
      const requiredDirs = [
        'test/unit/pqc/algorithms',
        'test/unit/pqc/services',
        'test/integration/pqc',
        'test/performance/pqc',
        'test/security/pqc',
        'test/fixtures/pqc',
        'scripts/test-automation'
      ];
      
      requiredDirs.forEach(dir => {
        const fullPath = join(baseDir, dir);
        expect(existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('Test Files Created', () => {
    it('should have created basic test framework files', () => {
      const requiredFiles = [
        'test/unit/pqc/algorithms/kyber.test.ts',
        'test/unit/pqc/algorithms/dilithium.test.ts',
        'test/integration/pqc/pqc-authentication-flow.test.ts',
        'test/performance/pqc/kyber-performance.test.ts',
        'test/performance/pqc/dilithium-performance.test.ts',
        'test/security/pqc/cryptographic-security.test.ts',
        'test/security/pqc/nist-compliance.test.ts',
        'scripts/test-automation/run-pqc-tests.sh'
      ];
      
      requiredFiles.forEach(file => {
        const fullPath = join(baseDir, file);
        expect(existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('npm Scripts Configuration', () => {
    it('should have PQC test commands in package.json', () => {
      const packageJson = require(join(baseDir, 'package.json'));
      
      expect(packageJson.scripts).toHaveProperty('test:unit:pqc');
      expect(packageJson.scripts).toHaveProperty('test:integration:pqc');
      expect(packageJson.scripts).toHaveProperty('test:performance:pqc');
      expect(packageJson.scripts).toHaveProperty('test:security:pqc');
    });
  });

  describe('Test Automation Scripts', () => {
    it('should have executable test automation script', () => {
      const scriptPath = join(baseDir, 'scripts/test-automation/run-pqc-tests.sh');
      expect(existsSync(scriptPath)).toBe(true);
      
      const fs = require('fs');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      expect(scriptContent).toContain('npm run test:unit:pqc');
      expect(scriptContent).toContain('npm run test:integration:pqc');
    });
  });
});
