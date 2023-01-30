import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class IssueDto {
  @ApiProperty({
    description: 'Issue subject',
  })
  subject: string;

  @ApiProperty({
    description: 'Issue description',
  })
  description: string;

  @ApiProperty({
    description: 'Issue owner email',
  })
  @IsEmail()
  email: string;
}
