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

    const endpoint = `/public/signup/${onboardingCode}`;
    const patientPortalUrl = this.configService.get('PATIENT_PORTAL_URL');
    const signUpUrl = new URL(endpoint, patientPortalUrl).href;

    const response = await this.eventsService.updateEndpoint(
      { id: patientId, emailAddress: email, identifier, signUpUrl },
      patientId,
      'patient',
    );
    return response;
  }
}
