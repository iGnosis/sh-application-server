import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PhiTokenizeBodyDTO {
  @ApiProperty({
    description: 'Tokenize PHI data and replace with original value',
  })
  @IsNotEmpty()
  event: { [key: string]: any };
  @ApiProperty({
    description: 'Table details',
  })
  @IsNotEmpty()
  table: { [key: string]: any };
  @ApiProperty({
    description: 'User ID',
  })
  @IsNotEmpty()
  userId: string;
}
