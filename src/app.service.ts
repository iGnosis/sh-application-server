import { Injectable, Logger } from '@nestjs/common';
import { LogReportService } from './services/log-report/log-report.service';

@Injectable()
export class AppService {
  constructor(private readonly logger: Logger, private logReportService: LogReportService) {
    this.overrideLogger();
    this.overrideConsole();
    this.logger = new Logger(AppService.name);
  }

  overrideLogger() {
    const originalLog = Logger.prototype.log;
    Logger.prototype.log = (...args: any[]) => {
      this.logReportService.reportLog(
        (JSON.stringify(args).toLowerCase().includes('error') ? '[ERROR] ' : '[LOG] ') +
          JSON.stringify(args),
      );
      originalLog.apply(Logger.prototype, args);
    };

    const originalError = Logger.prototype.error;
    Logger.prototype.error = (...args: any[]) => {
      this.logReportService.reportLog('[ERROR] ' + JSON.stringify(args));
      originalError.apply(Logger.prototype, args);
    };

    const originalWarn = Logger.prototype.warn;
    Logger.prototype.warn = (...args: any[]) => {
      this.logReportService.reportLog('[WARN] ' + JSON.stringify(args));
      originalWarn.apply(Logger.prototype, args);
    };
  }

  overrideConsole() {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      this.logReportService.reportLog(
        (JSON.stringify(args).toLowerCase().includes('error') ? '[ERROR] ' : '[LOG] ') +
          JSON.stringify(args),
      );
      originalConsoleLog.apply(console, args);
    };

    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logReportService.reportLog('[ERROR] ' + args.toString());
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      this.logReportService.reportLog('[WARN] ' + JSON.stringify(args));
      originalConsoleWarn.apply(console, args);
    };
  }

  ping(): string {
    return 'success';
  }
}
