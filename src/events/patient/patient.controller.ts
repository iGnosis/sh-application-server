import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsService } from '../events.service';
import { NewPatientDto } from './patient.dto';

@Controller('events/patient')
export class PatientController {
  constructor(private eventsService: EventsService, private configService: ConfigService) {}

  @HttpCode(200)
  @Post('new')
  async newPatient(@Body() body: NewPatientDto) {
    const { id: patientId, email, identifier, onboardingCode } = body;

    try {
      const signUpUrl = new URL(
        `/public/signup/${onboardingCode}`,
        this.configService.get('$PATIENT_PORTAL_URL'),
      ).href;
      const response = await this.eventsService.updateEndpoint(
        { id: patientId, emailAddress: email, identifier, signUpUrl },
        patientId,
        'patient',
      );
      return response;
    } catch (err) {
      console.log('Error', err);
    }
  }
}
