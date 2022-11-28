import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class CreatePatientBody {
  @ApiProperty({
    description: 'Invite code to create a Patient',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;

  @ApiProperty({
    description: 'Patient name prefix',
  })
  @IsString()
  @IsNotEmpty()
  namePrefix: string;

  @ApiProperty({
    description: 'Patient first name',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Patient last name',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Patient email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone country code. eg. +91 for India',
  })
  @IsString()
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: 'Phone number',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class CreateStaffBody {
  @ApiProperty({
    description: 'Invite code to create a Staff',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;

  @ApiProperty({
    description: 'Staff first name',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Staff last name',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Staff email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone country code. eg. +91 for India',
  })
  @IsString()
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: 'Phone number',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
