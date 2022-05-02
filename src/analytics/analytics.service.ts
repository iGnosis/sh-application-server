import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private databaseService: DatabaseService) {}

  // required to display the reaction chart.
  async getAnalyticsData(sessionId: string): Promise<Array<any>> {
    const results = await this.databaseService.executeQuery(
      `-- Average reaction_time per task, score and created_at timestamp which indicates when
       -- the task was completed

      SELECT e1.session,
            e1.activity,
            a1.name as activity_name,
            e1.task_id,
            e1.attempt_id,
            e1.task_name,
            MAX(e1.created_at) - MIN(e1.created_at) as reaction_time,
            e2.score,
            e2.created_at
      FROM events e1
      JOIN events e2
      ON e1.attempt_id = e2.attempt_id
      JOIN activity a1
      ON a1.id = e1.activity
      WHERE e1.session = $1 AND
            (e1.event_type = 'taskStarted' OR e1.event_type = 'taskReacted') AND
            e2.event_type = 'taskEnded'
      GROUP BY e1.session, e1.activity, a1.name, e1.task_id, e1.attempt_id, e1.task_name, e2.created_at, e2.score
      ORDER BY e2.created_at ASC`,
      [sessionId],
    );
    return results;
  }

  async patientAchievementPerSession(
    patientId: string,
    startDate: string,
    endDate: string,
  ) {
    const results = this.databaseService.executeQuery(
      `
    SELECT e1.session AS "sessionId", s1."createdAt", c1.name AS "careplanName", avg(e1.score) AS "avgAchievement"
    FROM events e1
    JOIN session s1
    ON e1.session = s1.id
    JOIN careplan c1
    ON s1.careplan = c1.id
    WHERE
        e1.event_type = 'taskEnded' AND
        s1.patient = $1 AND
        s1."createdAt" >= $2 AND
        s1."createdAt" <= $3
    GROUP BY e1.session, c1.name, s1."createdAt"
    ORDER BY s1."createdAt" ASC`,
      [patientId, startDate, endDate],
    );
    return results;
  }

  async patientEngagementRatio(
    patientId: string,
    startDate: string,
    endDate: string,
  ) {
    const results = await this.databaseService.executeQuery(
      `
    -- Engagement Chart Analytics
    SELECT
        s1.id AS "sessionId",
        s1."createdAt" AS "sessionCreatedAt",
        s1.careplan AS "careplanId",
        c1.name AS "careplanName",
        CAST(SUM(ca1.reps) AS INT) AS "totalRepsCount"
    FROM session s1
    JOIN careplan_activity ca1
    ON ca1.careplan = s1.careplan
    JOIN careplan c1
    ON c1.id = ca1.careplan
    JOIN events e1
    ON e1.session = s1.id
    WHERE
        s1.patient = $1 AND
        s1."createdAt" >= $2 AND -- startDate
        s1."createdAt" <= $3 AND -- endDate
        e1.event_type = 'taskEnded'
    GROUP BY
        s1.id, c1.id, ca1.careplan, e1.id
    ORDER BY s1."createdAt" ASC`,
      [patientId, startDate, endDate],
    );

    const sessionIds = results.map((o) => o.sessionId);
    const filteredResults = results.filter(
      ({ sessionId }, index) => !sessionIds.includes(sessionId, index + 1),
    );

    filteredResults.forEach((item) => {
      const id = item.sessionId;
      item.totalTasksCount = 0;
      results.forEach((result) => {
        if (id === result.sessionId) {
          item.totalTasksCount++;
        }
      });
      item.engagementRatio = parseFloat(
        (item.totalTasksCount / item.totalRepsCount).toFixed(2),
      );
    });
    return filteredResults;
  }

  async sessionEngagementRatio(sessionId: string) {
    const results = await this.databaseService.executeQuery(
      `
    SELECT
      s1.id AS "sessionId",
      SUM(ca1.reps) AS "totalRepsCount"
    FROM session s1
    JOIN careplan_activity ca1
    ON ca1.careplan = s1.careplan
    JOIN careplan c1
    ON c1.id = ca1.careplan
    JOIN events e1
    ON e1.session = s1.id
    WHERE
      s1.id = $1 AND
      e1.event_type = 'taskEnded'
    GROUP BY
      s1.id, e1.id`,
      [sessionId],
    );

    if (results && Array.isArray(results) && results.length > 0) {
      const totalReps = results[0].totalRepsCount;
      const totalCompletedTask = results.length;
      return (totalCompletedTask / totalReps) * 100;
    }
  }

  // Put data in hierarchy.
  transformifyData(sessionList: any[]): any {
    const patientObject: any = {};

    // build session
    for (const item of sessionList) {
      if (item.session) {
        patientObject[item.session] = {};
      }
    }

    // build activity
    for (const sessionId in patientObject) {
      // console.log(session)
      for (const item of sessionList) {
        if (sessionId == item.session && item.activity) {
          patientObject[sessionId][item.activity] = {};
        }
      }
    }

    // build events
    for (const sessionId in patientObject) {
      for (const activityId in patientObject[sessionId]) {
        for (const item of sessionList) {
          if (sessionId == item.session && activityId == item.activity) {
            if (patientObject[sessionId][activityId].events == undefined) {
              patientObject[sessionId][activityId]['events'] = [];
            }

            patientObject[sessionId][activityId]['events'].push({
              activityName: item.activity_name,
              taskName: item.task_name,
              reactionTime: parseFloat(item.reaction_time),
              createdAt: parseInt(item.created_at),
              score: parseFloat(item.score),
            });
          }
        }
      }
    }
    // this.logger.debug('tranformifyData:', patientObject)
    return patientObject;
  }
}
