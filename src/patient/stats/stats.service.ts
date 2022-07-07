import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  DailyGoalsApiResponse,
  GoalsApiResponse,
  GroupGoalsByDate,
  MonthlyGoalsApiResponse,
} from '../../types/stats';

@Injectable()
export class StatsService {
  constructor(private databaseService: DatabaseService) {}

  // endDate is exclusive
  async sessionDuration(
    patientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<GoalsApiResponse>> {
    const results = await this.databaseService.executeQuery(
      `SELECT
          session.id,
          session."createdAt",
          ((MAX(events.created_at) - MIN(events.created_at))) AS "sessionDurationInMs"
      FROM session
      INNER JOIN events
      ON events.session = session.id
      WHERE
          session.patient = $1 AND
          session.status <> 'trashed' AND
          session."createdAt" >= $2 AND
          session."createdAt" < $3
      GROUP BY session.id
      ORDER BY session."createdAt" DESC`,
      [patientId, startDate, endDate],
    );

    results.forEach((result) => {
      result.sessionDurationInMs = parseFloat(result.sessionDurationInMs);
      result.sessionDurationInMin = parseFloat((result.sessionDurationInMs / 1000 / 60).toFixed(2));
    });

    return results;
  }

  async getDailyGoals(
    patientId: string,
    activityIds: Array<string>,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<DailyGoalsApiResponse>> {
    const results = await this.databaseService.executeQuery(
      `SELECT DISTINCT
        activity
      FROM events
      WHERE
        patient = $1 AND
        activity = ANY($2::uuid[]) AND
        event_type = 'activityEnded' AND
        to_timestamp(created_at/1000) >= $3 AND
        to_timestamp(created_at/1000) < $4`,
      [patientId, activityIds, startDate, endDate],
    );
    return results;
  }

  // endDate is exclusive
  async getMonthlyGoals(
    patientId: string,
    startDate: Date,
    endDate: Date,
    dbTimezone: string,
  ): Promise<Array<MonthlyGoalsApiResponse>> {
    const results = await this.databaseService.executeQuery(
      `SELECT
        count(*) AS "activityEndedCount",
        DATE_TRUNC('day', timezone($4, to_timestamp(created_at/1000))) AS "createdAtLocaleDay"
      FROM events
      WHERE
        patient = $1 AND
        to_timestamp(created_at/1000) >= $2 AND
        to_timestamp(created_at/1000) < $3
      GROUP BY DATE_TRUNC('day', timezone($4, to_timestamp(created_at/1000))), event_type
      HAVING event_type = 'activityEnded'
      ORDER BY DATE_TRUNC('day', timezone($4, to_timestamp(created_at/1000))) DESC`,
      [patientId, startDate, endDate, dbTimezone],
    );
    return results;
  }

  groupByDate(results: Array<GoalsApiResponse>): Array<GroupGoalsByDate> {
    const temp = {};
    for (let i = 0; i < results.length; i++) {
      const date = results[i].createdAt.toISOString().split('T')[0];
      const duration = results[i].sessionDurationInMin;

      if (date in temp) {
        temp[date] += duration;
      } else {
        temp[date] = duration;
      }
    }

    const response = [];
    for (const [key, value] of Object.entries(temp)) {
      if (typeof value === 'number') {
        response.push({
          date: key,
          totalSessionDurationInMin: value,
        });
      }
    }
    return response;
  }

  workOutStreak(sessions: Array<GroupGoalsByDate>) {
    let streak = 0;
    let prevDate = new Date(new Date().toISOString().split('T')[0]);

    for (let i = 0; i < sessions.length; i++) {
      const sessionCreatedAt = new Date(sessions[i].date);
      const diff = prevDate.getTime() - sessionCreatedAt.getTime();

      // diff will be 0 if session/s is done on the same day.
      // diff will be 86400000 if session/s is done on the previous day.
      if (diff == 86400000 || diff == 0) {
        streak++;
      } else {
        break;
      }
      prevDate = sessionCreatedAt;
    }
    return streak;
  }

  getFutureDate(currentDate: Date, numOfDaysInFuture: number) {
    return new Date(currentDate.getTime() + 86400000 * numOfDaysInFuture);
  }

  getPastDate(currentDate: Date, numOfDaysInPast: number) {
    return new Date(currentDate.getTime() - 86400000 * numOfDaysInPast);
  }

  getDays(year: number, month: number) {
    return new Date(year, month, 0).getDate();
  }
}
