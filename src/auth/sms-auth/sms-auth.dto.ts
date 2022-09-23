import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SMSLoginBody {
  @ApiProperty({
    description: 'Country Code (eg. +91)',
  })
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: "User's Phone number",
  })
  @IsNotEmpty()
  phoneNumber: string;
}

export class SMSVerifyBody {
  @ApiProperty({
    description: 'Country Code (eg. +91)',
  })
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: "User's Phone number",
  })
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'OTP recieved',
  })
  @IsNotEmpty()
  otp: number;
}
