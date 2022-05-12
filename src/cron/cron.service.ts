import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GqlService } from 'src/services/gql/gql.service';
import { gql } from 'graphql-request';

@Injectable()
export class CronService {
  constructor(
    private databaseService: DatabaseService,
    private gqlService: GqlService
  ) { }

  async trashSessions() {
    const result: Array<{ sessionId: string }> = await this.databaseService.executeQuery(`
      SELECT
        s1.id as "sessionId"
      FROM session s1
      LEFT JOIN events e1
        ON e1.session = s1.id
      WHERE
        (
          s1.status != 'trashed' OR
          s1.status IS NULL
        ) AND
        e1.created_at IS NULL
      GROUP BY s1.id, s1."createdAt"
      ORDER BY s1."createdAt" DESC`
    )
    const sessionIds = result.map(obj => obj.sessionId)
    const query = gql`
      mutation MarkSessionAsTrashed($sessionIds: [uuid!]) {
        update_session(_set: {status: trashed}, where: {id: {_in: $sessionIds}}) {
          affected_rows
        }
      }`
    return this.gqlService.client.request(query, { sessionIds })
  }

  // we get all the sessions which aren't yet ended
  // and sessions with no activity in past 45 minutes are ended by force.
  async completeInactiveSessions() {
    const result: Array<{
      user: string,
      patient: string,
      session: string,
      created_at: number,
      score?: number,
      event_type?: string
    }> = await this.databaseService.executeQuery(`
      SELECT e1.user, patient, session, MAX(created_at) as "created_at"
      FROM events e1
      WHERE session IN
        (SELECT session
        FROM events
        WHERE
          event_type != 'sessionEnded'
        GROUP BY session
        EXCEPT
        SELECT session
        FROM events
        WHERE
          event_type = 'sessionEnded'
        GROUP BY session)
      GROUP BY e1.user, patient, session`)

    const now = new Date().getTime()
    const sessionsToEnd = result.filter((obj) => {
      let timeDiffInMins = ((now - obj.created_at) / 1000 / 60)
      timeDiffInMins = Math.ceil(timeDiffInMins)
      if (timeDiffInMins > 45) {
        return true
      }
      return false
    })

    sessionsToEnd.forEach(obj => {
      obj.score = 0
      obj.event_type = 'sessionEnded'
    })

    const query = gql`
      mutation EndSession($objects: [events_insert_input!] = {user: "", patient: "", session: "", score: "0", created_at: "", event_type: "sessionEnded"}) {
        insert_events(objects: $objects) {
          affected_rows
        }
      }`

    return this.gqlService.client.request(query, { objects: sessionsToEnd })
  }
}
