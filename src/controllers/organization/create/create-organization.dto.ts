import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

class AdminDetails {
  @ApiProperty({
    description: 'Admin phone country code',
  })
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: 'Admin phone number',
  })
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Admin email',
  })
  @IsEmail()
  email: string;
}

class OrgDetails {
  @ApiProperty({
    description: 'Name of an organization',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Organization type',
  })
  @IsNotEmpty()
  type: string;
}

export class CreateOrganizationBody {
  @ApiProperty({
    description: 'Organization Portal URL',
  })
  @IsNotEmpty()
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
