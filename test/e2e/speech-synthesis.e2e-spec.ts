import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';

describe('Speech Synthesis Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/speech/generate (GET)', () => {
    return request(app.getHttpServer())
      .get('/speech/generate?text=hello+world+this+is+test')
      .expect('Content-Type', /audio\/mpeg*/)
      .expect(200);
  });
});
