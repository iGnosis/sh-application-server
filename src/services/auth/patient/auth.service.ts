import { Injectable } from '@nestjs/common';
import { LoginRequestDto } from 'src/auth/auth.dto';
import { GqlService } from '../../gql/gql.service';
import { gql } from 'graphql-request';
import { Patient } from 'src/types/patient';

@Injectable()
export class PatientAuthService {
  constructor(private gqlService: GqlService) {}

  async login(credentials: LoginRequestDto): Promise<Patient> {
    const query = gql`
      query GetPatient($email: String) {
        patient(where: { email: { _eq: $email } }) {
          id
          identifier
          provider
          activeCareplan
          email
          careGiverEmail
          phoneCountryCode
          phoneNumber
        }
      }
    `;

    const response = await this.gqlService.client.request(query, {
      email: credentials.email,
    });

    if (!response || !Array.isArray(response.patient) || !response.patient.length) {
      console.log('No matching email found');
      return null;
    }

    // keep password same as email, temporary workaround.
    if (credentials.email !== credentials.password) {
      console.log('Invalid credentials.');
      return null;
    }

    return response.patient[0];
  }
}
