import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private databaseService: DatabaseService
  ) { }

  // required to display the reaction chart.
  async getAnalyticsData(sessionId: string): Promise<Array<any>> {
    let results = await this.databaseService.executeQuery(
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
      [sessionId]
    )

    // do data manipulation here as required by charts.

    return results;
  }

  async achievementPerSession(patientId: string, startDate: string, endDate: string) {
    let results = this.databaseService.executeQuery(`
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
    ORDER BY s1."createdAt" ASC`, [patientId, startDate, endDate])
    return results;
  }

  // Put data in hierarchy.
  transformifyData(sessionList: any[]): any {
    let patientObject: any = {}

    // build session
    for (const item of sessionList) {
      if (item.session) {
        patientObject[item.session] = {}
      }
    }

    // build activity
    for (const sessionId in patientObject) {
      // console.log(session)
      for (const item of sessionList) {
        if (sessionId == item.session && item.activity) {
          patientObject[sessionId][item.activity] = {}
        }
      }
    }

    // build events
    for (const sessionId in patientObject) {
      for (const activityId in patientObject[sessionId]) {
        for (const item of sessionList) {
          if (sessionId == item.session && activityId == item.activity) {

            if (patientObject[sessionId][activityId].events == undefined) {
              patientObject[sessionId][activityId]['events'] = []
            }

            patientObject[sessionId][activityId]['events'].push({
              activityName: item.activity_name,
              taskName: item.task_name,
              reactionTime: parseFloat(item.reaction_time),
              createdAt: parseInt(item.created_at),
              score: parseFloat(item.score)
            })

          }
        }
      }
    }
    // this.logger.debug('tranformifyData:', patientObject)
    return patientObject
  }
}
