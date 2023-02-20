import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { DashboardData } from 'src/types/global';

@Injectable()
export class DashboardService {
  constructor(private databaseService: DatabaseService) {}

  // NOTE: if oldVal is zero, it does not make sense to show percentage difference.
  percentageDiff(newVal: number, oldVal: number) {
    return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
  }

  buildMetricResponse(
    resp: Partial<DashboardData>,
    newCount: number,
    oldCount: number,
  ): Partial<DashboardData> {
    resp.newCount = parseFloat(newCount.toFixed(2));
    if (!oldCount) {
      resp.showPercentageChange = false;
    } else {
      resp.showPercentageChange = true;
      resp.percentageChange = parseFloat(this.percentageDiff(newCount, oldCount).toFixed(2));
    }
    return resp;
  }

  async newUsers(startDate: Date, endDate: Date, orgId: string): Promise<number> {
    const sql = `
    SELECT COUNT(*) AS "count"
    FROM patient
    WHERE
      "organizationId" = $3 AND
      "createdAt" >= $1 AND
      "createdAt" < $2
    `;
    const results = await this.databaseService.executeQuery(sql, [startDate, endDate, orgId]);
    return parseInt(results[0].count);
  }

  async activationMilestone(startDate: Date, endDate: Date, orgId: string): Promise<number> {
    // Activation Milestone: people who ran the activity in selected date range.
    const sql = `
    SELECT COUNT(DISTINCT patient) AS "count"
    FROM game
    WHERE
      "organizationId" = $3 AND
      "createdAt" >= $1 AND
      "createdAt" < $2
    `;
    const results = await this.databaseService.executeQuery(sql, [startDate, endDate, orgId]);
    return parseInt(results[0].count);
  }

  async avgUserEngagement(
    startDate: Date,
    endDate: Date,
    orgId: string,
  ): Promise<{
    patientsCount: number;
    totalGamePlayMins: number;
  }> {
    const sql = `
    SELECT p.id "patient", SUM(EXTRACT(EPOCH FROM (g."endedAt" - g."createdAt")) / 60) AS "totalGamePlayInMinutes"
    FROM patient p
    LEFT JOIN subscriptions s
    ON s."subscriptionId" = p."subscription"
    INNER JOIN game g
    ON g.patient = p.id
    WHERE
      p."organizationId" = $3 AND
      (
        s."status" = 'active' OR
        s."status" = 'trial_period'
      ) AND
      g."endedAt" IS NOT NULL AND
      g."createdAt" >= $1 AND
      g."createdAt" < $2
    GROUP BY p.id
    `;
    // ORDER BY "totalGamePlayInMinutes" DESC

    const results: {
      patient: string;
      totalGamePlayInMinutes: string;
    }[] = await this.databaseService.executeQuery(sql, [startDate, endDate, orgId]);

    const patientsCount = results.length;
    const totalGamePlayMins = results.reduce((acc, res) => {
      return acc + parseFloat(parseFloat(res.totalGamePlayInMinutes).toFixed(2));
    }, 0);
    return {
      patientsCount,
      totalGamePlayMins,
    };
  }

  async gamesPlayedCount(startDate: Date, endDate: Date, orgId: string) {
    const sql = `
    SELECT COUNT(*) "count"
    FROM game
    WHERE
      "organizationId" = $3 AND
      "createdAt" >= $1 AND
      "createdAt" < $2
    `;
    const results = await this.databaseService.executeQuery(sql, [startDate, endDate, orgId]);
    return parseInt(results[0].count);
  }

  async totalPatients(orgId: string) {
    const sql = `
    SELECT COUNT(*)
    FROM patient
    WHERE "organizationId" = $1
    `;
    const patientsCountSqlResults = await this.databaseService.executeQuery(sql, [orgId]);
    return parseInt(patientsCountSqlResults[0].count);
  }

  async activeUsers(startDate: Date, endDate: Date, orgId: string) {
    const sql = `
    SELECT COUNT(DISTINCT patient) "noOfPatients"
    FROM game
    WHERE
      game."createdAt" >= $1 AND
      game."createdAt" < $2 AND
      game."organizationId" = $3
    `;
    const results = await this.databaseService.executeQuery(sql, [startDate, endDate, orgId]);
    const activeUsers = parseInt(results[0].noOfPatients);
    return activeUsers;
  }

  async adpotionRate(startDate: Date, endDate: Date, orgId: string) {
    // (# of new active users / # of sign-ups) x 100
    const totalPatients = await this.totalPatients(orgId);
    const activeUsers = await this.activeUsers(startDate, endDate, orgId);
    const adpotionRate = (activeUsers / totalPatients) * 100;
    return adpotionRate;
  }
}
