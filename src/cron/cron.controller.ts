import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { SessionEventTriggerRequestDto, SessionInspectorEvent } from './cron.dto';
import { CronService } from './cron.service';
@Controller('cron')
// TODO: Enable Guards later.
// @UseGuards(AuthGuard)
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(private cronService: CronService) {}

  @Post('schedule-session-inspector')
  @HttpCode(201)
  // called when a session is inserted.
  async scheduleSessionInspector(@Body() body: SessionEventTriggerRequestDto) {
    const now = new Date();
    const fourtyFiveMinsInFuture = new Date(now.getTime() + 1000 * 60 * 45).toISOString();
    const payload = {
      sessionId: body.sessionId,
      createdAt: body.createdAt,
    };

    await this.cronService.scheduleOneOffCron(
      fourtyFiveMinsInFuture,
      '/cron/session/inspection',
      payload,
    );

    return {
      success: true,
    };
  }

  @Post('session/inspection')
  @HttpCode(200)
  // runs at 45mins after a session has been created.
  async inspectSessions(@Body() body: SessionInspectorEvent) {
    // The cronjob will run after 45min a session has been inserted.
    // Mark session as 'trashed', if no `taskEnded` event is found.
    // Mark session as 'completed' if session lasted for at least 30 minutes.
    // Mark session as 'partiallycompleted' if session lasted for less than 30 minutes.

    const { sessionId, createdAt } = body.payload;
    this.logger.debug('inspectSessions:sessionId:', sessionId);
    this.logger.debug('inspectSessions:createdAt:', createdAt);

    const sessionCreatedAt = new Date(createdAt);
    const nowDate = new Date();
    const diffInMins = (nowDate.getTime() - sessionCreatedAt.getTime()) / 1000 / 60;

    // only run if difference is greater or equal to 45
    if (diffInMins < 45) {
      return;
    }

    await this.cronService.inspectSession(sessionId);

    return {
      success: true,
    };
  }
}
