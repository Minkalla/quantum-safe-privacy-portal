import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { PQCPerformanceController } from '../../src/controllers/pqc-performance.controller';
import { DataAccessPerformanceService } from '../../src/services/data-access-performance.service';
import { JwtService } from '../../src/jwt/jwt.service';
import { JwtModule } from '../../src/jwt/jwt.module';

describe('PQC Performance API', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validJwtToken: string;

  beforeAll(async () => {
    process.env['SKIP_SECRETS_MANAGER'] = 'true';
    process.env['JWT_ACCESS_SECRET_ID'] = 'test-access-secret';
    process.env['JWT_REFRESH_SECRET_ID'] = 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule],
      controllers: [PQCPerformanceController],
      providers: [DataAccessPerformanceService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const tokens = jwtService.generateTokens({ userId: 'test-user', email: 'test@example.com' });
    validJwtToken = tokens.accessToken;
  });

  describe('Performance Stats API', () => {
    it('should get performance statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/pqc/performance/stats')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cache).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should get health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/pqc/performance/health')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health).toBeDefined();
      expect(response.body.health.status).toBe('healthy');
      expect(response.body.health.pqcEnabled).toBe(true);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
