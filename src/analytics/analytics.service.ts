import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private databaseService: DatabaseService
  ) { }

  // required to display the reaction chart.
  async getPatientReactionDataPerActivity(sessionId: string) {
    let results = await this.databaseService.executeQuery(
      `-- Average reaction_time per task, score and created_at timestamp which indicates when
       -- the task was completed

      SELECT e1.session,
            e1.activity,
            a1.name as activity_name,
            e1.task_id,
            e1.attempt_id,
            e1.task_name,
            MAX(CAST(e1.created_at AS BIGINT)) - MIN(CAST(e1.created_at AS BIGINT)) as reaction_time,
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
      ORDER BY CAST(e2.created_at AS BIGINT) ASC`,
      [sessionId]
    )

    // do data manipulation here as required by charts.

    return results;
  }

  // required to display the Achievement Ratio chart.
  async getPatientAchievementDataPerActivity(patientId: string) {
    let results = this.databaseService.executeQuery(`
      SELECT session, activity, task_id, task_name, AVG(score) as score, created_at
      FROM events
      WHERE
        patient = $1 AND
        event_type = 'taskEnded'
      GROUP BY session, activity, task_id, task_name, created_at
      ORDER BY CAST(created_at AS BIGINT) ASC`,
      [patientId])

    // do data manuplation if required

    return results;
  }
}
