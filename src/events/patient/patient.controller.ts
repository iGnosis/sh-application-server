import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EventsService } from '../events.service';
import { v4 as uuidv4 } from 'uuid';
import { NewPatientDto } from './patient.dto';

@Controller('events/patient')
export class PatientController {
  constructor(private eventsService: EventsService) {}

  @HttpCode(200)
  @Post('new')
  async newPatient(@Body() body: NewPatientDto) {
    const { id: patientId, email, identifier } = body;
    console.log('patient-id: ', patientId);
    console.log('email-id: ', email);
    console.log('identifier: ', identifier);
    const endpointId = uuidv4();

    try {
      console.log('endpointId: ', endpointId);
      const resp = await this.eventsService.updateEndpoint(
        { id: patientId, emailAddress: email, identifier },
        endpointId,
        'patient',
      );
      console.log(resp);
      return resp;
    } catch (err) {
      console.log('Error', err);
    }
  }
}
