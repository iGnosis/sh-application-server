import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GoalsApiResponse } from './stats';

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
    return results;
  }
}
