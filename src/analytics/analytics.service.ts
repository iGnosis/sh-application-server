import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private databaseService: DatabaseService
  ) { }

  async getPatientReactionData(patientId: string) {
    let results = await this.databaseService.executeQuery(
      `-- Average reaction_time per task, score and created_at timestamp which indicates when
       -- the task was completed

      SELECT e1.session,
            e1.activity,
            e1.task_id,
            e1.attempt_id,
            e1.task_name,
            MAX(CAST(e1.created_at AS BIGINT)) - MIN(CAST(e1.created_at AS BIGINT)) as reaction_time,
            e2.score,
            e2.created_at
      FROM events e1
      JOIN events e2
      ON e1.attempt_id = e2.attempt_id
      WHERE e1.patient = $1 AND
            (e1.event_type = 'taskStarted' OR e1.event_type = 'taskReacted') AND
            e2.event_type = 'taskCompleted'
      GROUP BY e1.session, e1.activity, e1.task_id, e1.attempt_id, e1.task_name, e2.created_at, e2.score
      ORDER BY CAST(e2.created_at AS BIGINT) ASC`,
      [patientId]
    )

    // do data manipulation here as required by charts.

    return results;
  }
}
