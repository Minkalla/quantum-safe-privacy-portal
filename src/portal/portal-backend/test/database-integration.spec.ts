import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentEntity } from '../src/entities/consent.entity';
import { UserEntity } from '../src/entities/user.entity';
import { ConsentService } from '../src/consent/consent.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '../src/jwt/jwt.service';
import { PQCFeatureFlagsService } from '../src/pqc/pqc-feature-flags.service';
import { PQCMonitoringService } from '../src/pqc/pqc-monitoring.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Database Integration Tests', () => {
  let consentService: ConsentService;
  let authService: AuthService;
  let consentRepository: Repository<ConsentEntity>;
  let userRepository: Repository<UserEntity>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          username: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'test',
          database: process.env.POSTGRES_DB || 'test',
          entities: [ConsentEntity, UserEntity],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([ConsentEntity, UserEntity]),
      ],
      providers: [
        ConsentService,
        AuthService,
        {
          provide: JwtService,
          useValue: {
            generateTokens: jest.fn().mockReturnValue({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            }),
          },
        },
        {
          provide: PQCFeatureFlagsService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: PQCMonitoringService,
          useValue: {
            recordUserRegistration: jest.fn(),
          },
        },
      ],
    }).compile();

    consentService = module.get<ConsentService>(ConsentService);
    authService = module.get<AuthService>(AuthService);
    consentRepository = module.get<Repository<ConsentEntity>>(getRepositoryToken(ConsentEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  afterEach(async () => {
    await consentRepository.clear();
    await userRepository.clear();
  });

  describe('Database Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      const count = await consentRepository.count();
      expect(count).toBe(0);
    });
  });

  describe('Consent Entity Operations', () => {
    it('should create and retrieve consent records', async () => {
      const testUserId = 'test-user-123';
      const consentData = {
        userId: testUserId,
        consentType: 'marketing' as const,
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      const createdConsent = await consentService.createConsent(consentData as any);
      expect(createdConsent.id).toBeDefined();
      expect(createdConsent.userId).toBe(testUserId);
      expect(createdConsent.consentType).toBe('marketing');
      expect(createdConsent.granted).toBe(true);

      const retrievedConsents = await consentService.getConsentByUserId(testUserId);
      expect(retrievedConsents).toHaveLength(1);
      expect(retrievedConsents[0].id).toBe(createdConsent.id);
    });

    it('should enforce unique constraint on userId + consentType', async () => {
      const testUserId = 'test-user-456';
      const consentData = {
        userId: testUserId,
        consentType: 'analytics' as const,
        granted: true,
      };

      await consentService.createConsent(consentData as any);
      
      await expect(
        consentService.createConsent(consentData as any)
      ).rejects.toThrow('Consent record already exists with the same granted status');
    });
  });

  describe('User Entity Operations', () => {
    it('should create and retrieve user records', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
      };

      const user = userRepository.create(userData);
      const savedUser = await userRepository.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();

      const foundUser = await userRepository.findOne({
        where: { email: 'test@example.com' }
      });
      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(savedUser.id);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'hashedpassword123',
      };

      const user1 = userRepository.create(userData);
      await userRepository.save(user1);

      const user2 = userRepository.create(userData);
      await expect(userRepository.save(user2)).rejects.toThrow();
    });
  });
});
