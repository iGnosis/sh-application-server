import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { StatsService } from 'src/patient/stats/stats.service';
import * as qs from 'qs';
import { PlotChartDTO } from 'src/types/provider-charts';

describe('Provider Charts Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            'https://hasura.io/jwt/claims': {
              'x-hasura-user-id': 123,
              'x-hasura-default-role': 'therapist',
            },
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // DatabaseService.prototype.executeQuery = jest.fn().mockReturnValue({})
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) - getAvgAchievementPercentageGroupByGames', async () => {
    DatabaseService.prototype.executeQuery = jest.fn().mockImplementation(() => {
      return [
        {
          createdAt: '2022-09-12T18:30:00.000Z',
          game: 'Sit Stand Achieve',
          avgAchievementPercentage: '78',
        },
        {
          createdAt: '2022-09-12T18:30:00.000Z',
          game: 'Sit Stand Achieve',
          avgAchievementPercentage: '90',
        },
      ];
    });
    const reqQueryStr = {
      startDate: '2022-09-12T18:30:00.000Z',
      endDate: '2022-09-15T18:30:00.000Z',
      userTimezone: 'Asia/Kolkata',
      patientId: '123',
      chartType: 'avgAchievementRatio',
      groupBy: 'week',
      isGroupByGames: false,
    };

    return request(app.getHttpServer())
      .get(`/provider-charts?${qs.stringify(reqQueryStr)}`)
      .expect(200)
      .then((res) => {
        console.log(res.body.data.results);
      });
  });
});
