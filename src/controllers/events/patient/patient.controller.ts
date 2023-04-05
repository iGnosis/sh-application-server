import { Body, Controller, HttpCode, Post, UseInterceptors } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { NovuSubscriberData, PatientFeedback } from 'src/types/global';
import { EventsService } from 'src/services/events/events.service';
import { FeedbackReceivedEvent, NewPatientDto } from './patient.dto';
import { NovuService } from 'src/services/novu/novu.service';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/common/decorators/user.decorator';

@Controller('events/patient')
export class PatientController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private novuService: NovuService,
    private configService: ConfigService,
  ) {}

  @HttpCode(200)
  @Post('update')
  async updatePatient(@Body() body: NewPatientDto) {
    const {
      id: patientId,
      email,
      nickname,
      firstName,
      lastName,
      namePrefix,
      phoneCountryCode,
      phoneNumber,
    } = body;

    const resp = await this.novuService.novuClient.subscribers.update(patientId, {
      email,
      firstName,
      lastName,
      phone: `${phoneCountryCode}${phoneNumber}`,
      data: {
        nickname,
        namePrefix,
        env: this.configService.get('ENV_NAME') || 'local',
      },
    });
    return resp.data;
  }

  @HttpCode(200)
  @Post('new')
  async newPatient(@Body() body: NewPatientDto) {
    const {
      id: patientId,
      email,
      nickname,
      firstName,
      lastName,
      namePrefix,
      phoneCountryCode,
      phoneNumber,
      organizationId,
    } = body;

    const novuData: NovuSubscriberData = {
      nickname,
      namePrefix,
      firstPaymentMade: false,
      firstActivityPlayed: false,
      pastSameActivityCount: 0,
      activityStreakCount: 0,
      sendInactiveUserReminder: false,
      quitDuringCalibrationMailSent: false,
      quitDuringTutorialMailSent: false,
      feedbackOn10ActiveDaysSent: false,
      organizationId,
      env: this.configService.get('ENV_NAME') || 'local',
    };

    // create Novu subscriber
    await this.novuService.novuClient.subscribers.identify(patientId, {
      email,
      firstName,
      lastName,
      phone: `${phoneCountryCode}${phoneNumber}`,
      data: { ...novuData },
    });

    const patient = await this.novuService.getPatientByPk(patientId);

    // trigger no payment done reminder
    await this.novuService.noPaymentDoneReminder(patient);

    // trigger no activity played reminder
    await this.novuService.noActivityStartedReminder(patient);

    return {
      status: 'success',
    };
  }

  @Post('quit-calibration')
  async patientQuitCalibration(@User('id') id: string) {
    await this.novuService.quitDuringCalibration(id);

    const novuData: Partial<NovuSubscriberData> = {
      quitDuringCalibrationMailSent: true,
    };
    await this.novuService.novuClient.subscribers.update(id, {
      data: { ...novuData },
    });
    return {
      status: 'success',
    };
  }

  @Post('quit-tutorial')
  async patientQuitTutorial(@User('id') id: string) {
    await this.novuService.quitDuringTutorial(id);
    const novuData: Partial<NovuSubscriberData> = {
      quitDuringTutorialMailSent: true,
    };
    await this.novuService.novuClient.subscribers.update(id, {
      data: { ...novuData },
    });
    return {
      status: 'success',
    };
  }

  @Post('contact-support-success')
  async patientContactSupport(@User('id') id: string) {
    await this.novuService.contactSupportSuccess(id);
    return {
      status: 'success',
    };
  }

  @Post('feedback-fab-success')
  async patientFeedbackSupport(@User('id') id: string) {
    await this.novuService.fabFeedbackSuccess(id);
    return {
      status: 'success',
    };
  }

  // called by Hasura on-off scheduled cron job.
  // this would run 5min after a feedback has been inserted.
  @Post('feedback-received')
  async feedbackSubmitted(@Body() body: FeedbackReceivedEvent) {
    const { feedbackId } = body.payload;

    // get feedback from gql
    const getFeedbackQuery = `
      query GetFeedback($feedbackId: uuid!) {
        patient_feedback_by_pk(id: $feedbackId) {
          patientByPatient {
            id
            nickname: pii_nickname(path: "value")
            email: pii_email(path: "value")
          }
          createdAt
          updatedAt
          response
        }
      }`;

    const feedback: { patient_feedback_by_pk: PatientFeedback } =
      await this.gqlService.client.request(getFeedbackQuery, { feedbackId });

    if (!feedback || !feedback.patient_feedback_by_pk) {
      return;
    }
    await this.eventsService.sendFeedbackEmail(feedback.patient_feedback_by_pk);
    return {
      status: 'success',
    };
  }
}
