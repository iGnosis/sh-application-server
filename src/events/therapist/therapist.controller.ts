import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EventsService } from '../events.service';
import { v4 as uuidv4 } from 'uuid';
import { NewTherapistDto, TherapistAddedFirstPatientDto } from './therapist.dto';
import { GqlService } from 'src/services/gql/gql.service';
import { gql } from 'graphql-request';

@Controller('events/therapist')
export class TherapistController {
  constructor(private eventsService: EventsService, private gqlService: GqlService) {}

  @HttpCode(200)
  @Post('new')
  async newTherapist(@Body() body: NewTherapistDto) {
    const { id: therapistId, email, firstName, lastName, type } = body;
    console.log('new Therapist');
    console.log('therapist-id: ', therapistId);
    const endpointId = uuidv4();

    if (type && type === 'therapist') {
      try {
        console.log('endpointId: ', endpointId);
        const resp = await this.eventsService.updateEndpoint(
          {
            id: therapistId,
            emailAddress: email,
            identifier: `${firstName} ${lastName}`,
          },
          endpointId,
          'therapist',
        );
        console.log(resp);
        return resp;
      } catch (err) {
        console.log(err);
      }
    }
  }

  @HttpCode(200)
  @Post('added-first-patient')
  async addPatient(@Body() body: TherapistAddedFirstPatientDto) {
    const { id: patientId, identifier, primaryTherapist: therapistId } = body;
    console.log('identifier', identifier);
    console.log('therapist-id: ', therapistId);
    console.log('patient-id: ', patientId);

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
        await this.eventsService.startAddedFirstPatientJourney(therapistId, identifier);
      }
    } catch (err) {
      console.log('Error', err);
    }
  }
}
