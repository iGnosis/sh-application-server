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

    const url = new URL(this.configService.get('PATIENT_PORTAL_URL'));
    url.searchParams.set('code', onboardingCode);
    url.searchParams.set('email', email);

    const signUpUrl = url.href;
    console.log('signUpUrl:', signUpUrl)

    const urlPart1 = signUpUrl.slice(0, signUpUrl.length / 2)
    const urlPart2 = signUpUrl.slice(signUpUrl.length / 2, signUpUrl.length)

    const response = await this.eventsService.updateEndpoint(
      { id: patientId, emailAddress: email, identifier, urlPart1, urlPart2 },
      patientId,
      'patient',
    );
    return response;
  }
}
