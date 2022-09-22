import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService {
  // so we can log queries as they happen.
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject('DATABASE_POOL') private pool: Pool) {}

  async executeQuery(queryText: string, values: any[] = []): Promise<any[]> {
    // this.logger.debug(`Executing query: ${queryText} (${values})`);
    return this.pool.query(queryText, values).then((result: QueryResult) => {
      // this.logger.debug(`Executed query, result size: ${result.rows.length}`);
      return result.rows;
    });
  }

  getConnectionPool() {
    return this.pool;
  }
}
