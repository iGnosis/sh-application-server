import { IsNotEmpty } from 'class-validator';

export class NewPatientDto {
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  identifier: string;
}
