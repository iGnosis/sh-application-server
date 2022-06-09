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
    const endpointId = uuidv4();

    try {
      const response = await this.eventsService.updateEndpoint(
        { id: patientId, emailAddress: email, identifier },
        endpointId,
        'patient',
      );
      return response;
    } catch (err) {
      console.log('Error', err);
    }
  }
}
