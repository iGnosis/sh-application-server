import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from 'src/database/database.module';
import { GqlService } from 'src/services/gql/gql.service';
import { StatsService } from './stats.service';

describe('Stat Service', () => {
  let service: StatsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [StatsService, GqlService, ConfigService],
    }).compile();
    service = module.get<StatsService>(StatsService);
  });

  it('should get future date', () => {
    // given
    const now = new Date();
    const noOfDaysInFuture = 7;
    const noOfMsInADay = 24 * 60 * 60 * 1000;

    // when
    const futureDate = service.getFutureDate(now, noOfDaysInFuture);

    // then
    expect(futureDate).toBeInstanceOf(Date);
    expect(futureDate.getTime()).toBe(now.getTime() + noOfMsInADay * noOfDaysInFuture);
  });

  it('should get past date', () => {
    // given
    const now = new Date();
    const noOfDaysInPast = 7;
    const noOfMsInADay = 24 * 60 * 60 * 1000;

    // when
    const futureDate = service.getPastDate(now, noOfDaysInPast);

    // then
    expect(futureDate).toBeInstanceOf(Date);
    expect(futureDate.getTime()).toBe(now.getTime() - noOfMsInADay * noOfDaysInPast);
  });

  it('should get number of days in a month', () => {
    // given
    const year = 2022;
    const months = {
      1: 31, // January
      2: 28,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31, // December
    };

    for (const [monthIdx, expectedNoOfDays] of Object.entries(months)) {
      // when
      const noOfDays = service.getDaysInMonth(year, Number(monthIdx));
      // then
      expect(noOfDays).toBe(expectedNoOfDays);
    }
  });

  it('should get difference between two dates', () => {
    // given
    const now = new Date();
    const noOfMsInADay = 24 * 60 * 60 * 1000;
    const daysInFuture = 39;
    const futureDate = new Date(now.getTime() + noOfMsInADay * daysInFuture);

    // when
    const diff = service.getDiffInDays(now, futureDate);

    // then
    expect(diff).toBe(daysInFuture);
  });
});
