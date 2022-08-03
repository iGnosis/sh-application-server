import { Module } from '@nestjs/common';
import { AuthService } from 'src/services/auth/auth.service';
import { EmailService } from 'src/services/email/email.service';
import { GqlService } from 'src/services/gql/gql.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { AuthController } from './auth.controller';
import { PatientAuthService } from 'src/services/auth/patient/auth.service';
import { PatientJwtService } from 'src/services/jwt/patient/jwt.service';
import { EventsService } from 'src/events/events.service';
import { Auth0Service } from './auth0/auth0.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    GqlService,
    JwtService,
    EmailService,
    PatientAuthService,
    PatientJwtService,
    EventsService,
    Auth0Service,
  ],
})
export class AuthModule {}
