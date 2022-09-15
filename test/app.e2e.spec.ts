import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            'https://hasura.io/jwt/claims': {
              'x-hasura-user-id': 123,
              'x-hasura-default-role': 'patient',
            },
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          data: 'Hello World 222',
        });
      });
  });
});
