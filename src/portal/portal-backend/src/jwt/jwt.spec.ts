import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets/secrets.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: SecretsService,
          useValue: {
            getSecret: jest.fn().mockResolvedValue('mock-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
