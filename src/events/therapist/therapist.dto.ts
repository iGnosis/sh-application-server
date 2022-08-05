import { IsNotEmpty } from 'class-validator';

export class NewTherapistDto {
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsNotEmpty()
  type: string;
}

export class TherapistAddedFirstPatientDto {
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  identifier: string;

  @IsNotEmpty()
  primaryTherapist: string;
}
