import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EventsService } from '../events.service';
import { NewPatientDto } from './patient.dto';

@Controller('events/patient')
export class PatientController {
  constructor(private eventsService: EventsService) {}

  @HttpCode(200)
  @Post('new')
  async newPatient(@Body() body: NewPatientDto) {
    const { id: patientId, email, identifier, onboardingCode } = body;

    try {
      const response = await this.eventsService.updateEndpoint(
        { id: patientId, emailAddress: email, identifier, onboardingCode },
        patientId,
        'patient',
      );
      return response;
    } catch (err) {
      console.log('Error', err);
    }
  }
}
