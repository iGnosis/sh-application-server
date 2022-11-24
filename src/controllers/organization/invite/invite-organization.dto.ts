import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailInviteBody {
  @ApiProperty({
    description: 'Organization Portal URL',
  })
  @IsNotEmpty()
  redirectUrl: string;

  @ApiProperty({
    description: 'Email address to send an invite to',
  })
  @IsEmail()
  email: string;
}
