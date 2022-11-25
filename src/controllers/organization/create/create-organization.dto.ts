import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';

class AdminDetails {
  @ApiProperty({
    description: 'Admin phone country code',
  })
  @IsNotEmpty()
  @IsString()
  phoneCountryCode: string;

  @ApiProperty({
    description: 'Admin phone number',
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Admin email',
  })
  @IsEmail()
  @IsString()
  email: string;
}

class OrgDetails {
  @ApiProperty({
    description: 'Name of an organization',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Organization type',
  })
  @IsNotEmpty()
  @IsString()
  type: string;
}

export class CreateOrganizationBody {
  @ApiProperty({
    description: 'Organization Portal URL',
  })
  @IsNotEmpty()
  @IsString()
  inviteCode: string;

  @ApiProperty({
    description: 'Admin details',
  })
  @ValidateNested()
  adminDetails: AdminDetails;

  @ApiProperty({
    description: 'Organization details',
  })
  @ValidateNested()
  orgDetails: OrgDetails;
}

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
