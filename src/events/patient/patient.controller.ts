import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlService } from 'src/services/gql/gql.service';
import { PatientFeedback } from 'src/types/patient';
import { EventsService } from '../events.service';
import { FeedbackReceivedEvent, NewPatientDto } from './patient.dto';

@Controller('events/patient')
export class PatientController {
  constructor(
    private eventsService: EventsService,
    private configService: ConfigService,
    private gqlService: GqlService,
  ) {}

  @HttpCode(200)
  @Post('new')
  async newPatient(@Body() body: NewPatientDto) {
    const { id: patientId, email, identifier, onboardingCode } = body;

    const url = new URL('/public/signup', this.configService.get('PATIENT_PORTAL_URL'));
    url.searchParams.set('code', onboardingCode);
    url.searchParams.set('email', email);

    const signUpUrl = url.href;
    console.log('signUpUrl:', signUpUrl);

    const urlPart1 = signUpUrl.slice(0, signUpUrl.length / 2);
    const urlPart2 = signUpUrl.slice(signUpUrl.length / 2, signUpUrl.length);

    const response = await this.eventsService.updateEndpoint(
      { id: patientId, emailAddress: email, identifier, urlPart1, urlPart2 },
      patientId,
      'patient',
    );
    return response;
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
          description
          rating
          recommendationScore
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
