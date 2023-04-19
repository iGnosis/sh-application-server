import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

// The purpose of this module is to connect to the database
// expose a service for executing queries on the database.
// Ref: https://javascript.plainenglish.io/how-to-execute-raw-postgresql-queries-in-nestjs-1967a0cb950b

const databasePoolFactory = async (configService: ConfigService) => {
  const pool = new Pool({
    user: configService.get('POSTGRES_USER'),
    host: configService.get('POSTGRES_HOST'),
    database: configService.get('POSTGRES_DB'),
    password: configService.get('POSTGRES_PASSWORD'),
    port: configService.get('POSTGRES_PORT'),
    ssl: configService.get('ENV_NAME') === 'local' ? false : true,
    max: 8,
    idleTimeoutMillis: 60 * 1000, // each connection stay idle for 1 min.
    idle_in_transaction_session_timeout: 2 * 60 * 1000, // each transaction can run for 2 min max,
  });

  return pool;
};

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      inject: [ConfigService],
      useFactory: databasePoolFactory,
    },
    DatabaseService,
    ConfigService,
    Logger,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  onApplicationShutdown(signal?: string): any {
    this.logger.log(`Shutting down on signal ${signal}`);
    const pool = this.moduleRef.get('DATABASE_POOL') as Pool;
    return pool.end();
  }
}
