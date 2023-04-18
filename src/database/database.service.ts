import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService {
  // so we can log queries as they happen.

  constructor(@Inject('DATABASE_POOL') private pool: Pool, private readonly logger: Logger) {
    this.logger = new Logger(DatabaseService.name);
  }

  async executeQuery(queryText: string, values: any[] = []): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      // this.logger.debug(`Executing query: ${queryText} (${values})`);
      return this.pool.query(queryText, values).then((result: QueryResult) => {
        // this.logger.debug(`Executed query, result size: ${result.rows.length}`);
        return result.rows;
      });
    } finally {
      client.release();
    }
  }

  getConnectionPool() {
    return this.pool;
  }
}
