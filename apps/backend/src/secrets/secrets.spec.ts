import { Test, TestingModule } from '@nestjs/testing';
import { SecretsService } from './secrets.service';
import { ConfigService } from '@nestjs/config';

describe('SecretsService', () => {
  let service: SecretsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
              case 'SKIP_SECRETS_MANAGER':
                return 'true';
              case 'AWS_REGION':
                return 'us-east-1';
              case 'JWT_ACCESS_SECRET_ID':
                return 'example/my-first-jwt-secret';
              case 'JWT_REFRESH_SECRET_ID':
                return 'example/test-example-test';
              default:
                return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSecret', () => {
    it('should return dummy secret when SKIP_SECRETS_MANAGER is true', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'SKIP_SECRETS_MANAGER') return 'true';
        return 'mock-value';
      });

      const result = await service.getSecret('example/my-first-jwt-secret');
      expect(result).toBe('DUMMY_SECRET_FOR_EXAMPLE_MY_FIRST_JWT_SECRET');
    });

    it('should retrieve real secret when SKIP_SECRETS_MANAGER is false', async () => {
      const result = await service.getSecret('example/my-first-jwt-secret');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle different secret IDs', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'SKIP_SECRETS_MANAGER') return 'true';
        return 'mock-value';
      });

      const accessResult = await service.getSecret('example/my-first-jwt-secret');
      const refreshResult = await service.getSecret('example/test-example-test');

      expect(accessResult).toBe('DUMMY_SECRET_FOR_EXAMPLE_MY_FIRST_JWT_SECRET');
      expect(refreshResult).toBe('DUMMY_SECRET_FOR_EXAMPLE_TEST_EXAMPLE_TEST');
    });

    it('should cache secrets for performance', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'SKIP_SECRETS_MANAGER') return 'true';
        return 'mock-value';
      });

      const result1 = await service.getSecret('example/my-first-jwt-secret');
      const result2 = await service.getSecret('example/my-first-jwt-secret');

      expect(result1).toBe(result2);
    });
  });
});
