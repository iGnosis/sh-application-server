import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from './database.module';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  xit('should have database connectivity', async () => {
    const dbVersion = await service.executeQuery('SELECT version()');
    expect(JSON.stringify(dbVersion)).toContain('PostgreSQL 10.18');
  });

  xit('should get connection pool', async () => {
    const connection = await service.getConnectionPool().connect();
    expect(connection).toBeTruthy();
  });
});
