import { Test, TestingModule } from '@nestjs/testing';
import { PatientJwtService } from './jwt.service';

describe('JwtService', () => {
  let service: PatientJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientJwtService],
    }).compile();

    service = module.get<PatientJwtService>(PatientJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
