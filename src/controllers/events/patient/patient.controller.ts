import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { PatientFeedback } from 'src/types/global';
import { EventsService } from 'src/services/events/events.service';
import { FeedbackReceivedEvent, NewPatientDto } from './patient.dto';

@Controller('events/patient')
export class PatientController {
  constructor(private eventsService: EventsService, private gqlService: GqlService) {}

  @HttpCode(200)
  @Post('new')
  // runs when a patient is inserted.
  async newPatient(@Body() body: NewPatientDto) {
    const { id: patientId, email, nickname } = body;
    const response = await this.eventsService.updateEndpoint(
      { id: patientId, emailAddress: email, nickname },
      patientId,
      'patient',
    );
    await this.eventsService.userSignUp(patientId);
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
