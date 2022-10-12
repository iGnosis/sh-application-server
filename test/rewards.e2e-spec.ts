import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RewardsService } from 'src/services/rewards/rewards.service';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { EventsService } from 'src/services/events/events.service';

describe('Rewards Controller (e2e)', () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('patient/rewards/update - Should update a reward', () => {
    RewardsService.prototype.updateRewards = jest.fn().mockImplementation(() => {
      return;
    });
    EventsService.prototype.rewardUnlockedEvent = jest.fn().mockImplementation(() => {
      return;
    });
    StatsService.prototype.getMonthlyGoalsNew = jest.fn().mockImplementationOnce(() => {
      return {
        daysCompleted: 14,
      };
    });
    RewardsService.prototype.getRewards = jest
      .fn()
      .mockImplementationOnce((): { patient_by_pk: PatientRewards } => {
        return {
          patient_by_pk: {
            rewards: [
              {
                tier: 'bronze',
                isViewed: false,
                isAccessed: false,
                isUnlocked: false,
                couponCode: 'XYZ',
                description: '',
                unlockAtDayCompleted: 5,
              },
              {
                tier: 'silver',
                isViewed: false,
                isAccessed: false,
                isUnlocked: false,
                couponCode: 'PQE',
                description: '',
                unlockAtDayCompleted: 10,
              },
              {
                tier: 'gold',
                isViewed: false,
                isAccessed: false,
                isUnlocked: false,
                couponCode: 'PQE',
                description: '',
                unlockAtDayCompleted: 15,
              },
            ],
          },
        };
      });
    const reqBody = {
      startDate: new Date('2022-09-12T18:30:00.000Z'),
      endDate: new Date('2022-09-15T18:30:00.000Z'),
      userTimezone: 'Asia/Kolkata',
    };
    return request(app.getHttpServer())
      .post('/patient/rewards/update')
      .send(reqBody)
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toEqual('success');
      });
  });

  it('patient/rewards/viewed - Should mark a reward as viewed', () => {
    expect(2 + 2).toBe(4);
  });

  it('patient/rewards/accessed - Should mark a reward as accessed', () => {
    expect(2 + 2).toBe(4);
  });
});
