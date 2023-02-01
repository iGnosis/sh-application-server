import { Body, Controller, Post } from '@nestjs/common';
import { ScheduleEmailFeedback } from './cron.dto';
import { CronService } from '../../services/cron/cron.service';
@Controller('cron')
export class PatientFeedbackController {
  constructor(private cronService: CronService) {}

  @Post('email-patient-feedback')
  async scheduleEmailFeedback(@Body() body: ScheduleEmailFeedback) {
    const { feedbackId } = body;
    const now = new Date();
    const FiveMinsInFuture = new Date(now.getTime() + 1000 * 60 * 5).toISOString();
    const payload = { feedbackId };
    await this.cronService.scheduleOneOffCron(
      FiveMinsInFuture,
      '/events/patient/feedback-received',
      payload,
    );
    return {
      status: 'success',
    };
  }
}
