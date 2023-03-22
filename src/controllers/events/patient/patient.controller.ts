import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { PatientFeedback } from 'src/types/global';
import { EventsService } from 'src/services/events/events.service';
import { FeedbackReceivedEvent, NewPatientDto } from './patient.dto';
import { NovuService } from 'src/services/novu/novu.service';
import { NovuTriggerEnum, UserRole } from 'src/types/enum';
import { ConfigService } from '@nestjs/config';
import { PhiService } from 'src/services/phi/phi.service';
import { DatabaseService } from 'src/database/database.service';

@Controller('events/patient')
export class PatientController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private novuService: NovuService,
    private logger: Logger,
    private configService: ConfigService,
    private phiService: PhiService,
    private databaseService: DatabaseService,
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
    } = body;

    // TODO: Remove PinPoint related codes once Novu is functional.
    const response = await this.eventsService.updateEndpoint(
      { id: patientId, emailAddress: email, nickname },
      patientId,
      'patient',
    );
    await this.eventsService.userSignUp(patientId);

    // create Novu subscriber
    await this.novuService.novuClient.subscribers.identify(patientId, {
      email,
      firstName,
      lastName,
      phone: `${phoneCountryCode}${phoneNumber}`,
      data: {
        nickname,
        namePrefix,
        paymentMade: false,
        env: this.configService.get('ENV_NAME') || 'local',
      },
    });

    try {
      // send welcome email to subscriber
      await this.novuService.novuClient.trigger(NovuTriggerEnum.WELCOME_EMAIL, {
        to: {
          subscriberId: patientId,
        },
        payload: {},
      });
    } catch (error) {
      this.logger.error('error while sending welcome email ' + JSON.stringify(error));
    }

    try {
      // remind patient if they didn't set payments after a while.
      await this.novuService.novuClient.trigger(NovuTriggerEnum.PAYMENT_REMINDER, {
        to: {
          subscriberId: patientId,
        },
        payload: {},
      });
    } catch (error) {
      this.logger.error(
        'error while activating payment reminder template ' + JSON.stringify(error),
      );
    }

    return 'success';
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
            nickname
            email
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
