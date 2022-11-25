import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailInviteBody {
  @ApiProperty({
    description: 'Invite code to create an admin user',
  })
  @IsString()
  inviteCode: string;

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
