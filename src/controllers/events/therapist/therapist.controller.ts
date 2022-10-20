import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { NewTherapistDto, TherapistAddedFirstPatientDto } from './therapist.dto';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { gql } from 'graphql-request';
import { EventsService } from 'src/services/events/events.service';

@Controller('events/therapist')
export class TherapistController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(TherapistController.name);
  }

  @HttpCode(200)
  @Post('new')
  async newTherapist(@Body() body: NewTherapistDto) {
    const { id: therapistId, email, firstName, lastName, type } = body;

    if (type && type === 'therapist') {
      try {
        const response = await this.eventsService.updateEndpoint(
          {
            id: therapistId,
            emailAddress: email,
            nickname: 'therapist',
          },
          therapistId,
          'therapist',
        );
        return response;
      } catch (err) {
        this.logger.error('newTherapist: ' + JSON.stringify(err));
      }
    }
  }

  @HttpCode(200)
  @Post('added-first-patient')
  async addPatient(@Body() body: TherapistAddedFirstPatientDto) {
    const { identifier, primaryTherapist: therapistId } = body;
    const fetchTherapistPatientCount = gql`
      query CountTherapistPatients($therapistId: uuid = "") {
        patient_aggregate(where: { primaryTherapist: { _eq: $therapistId } }) {
          aggregate {
            count
          }
        }
      }
    `;

    try {
      const response = await this.gqlService.client.request(fetchTherapistPatientCount, {
        therapistId,
      });
      if (response && response.patient_aggregate.aggregate.count === 1) {
        const putEventsResponse = await this.eventsService.startAddedFirstPatientJourney(
          therapistId,
          identifier,
        );
        return putEventsResponse;
      }
    } catch (err) {
      this.logger.error('addPatient: ' + JSON.stringify(err));
    }
  }
}
