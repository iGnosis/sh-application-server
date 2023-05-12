import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PhiTokenizeBodyDTO {
  @ApiProperty({
    description: 'Hasura event object',
  })
  @IsNotEmpty()
  event: { [key: string]: any };

  @ApiProperty({
    description: 'Hasura table object',
  })
  table: {
    schema: string;
    name: string;
  };
}

export class UpdatePhiColumnDto {
  @ApiProperty({
    description: 'Hasura event object',
  })
  @IsNotEmpty()
  event: { [key: string]: any };

  @ApiProperty({
    description: 'Hasura table object',
  })
  table: {
    schema: string;
    name: string;
  };
}

export class MaskPhiDto {
  @ApiProperty({
    description: 'PHI token UUID to be masked',
  })
  @IsNotEmpty()
  phiToken: string;
}
