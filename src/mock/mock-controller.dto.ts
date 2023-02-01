import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';

export class CreateTestJwtBody {
  @ApiProperty({
    description: 'Specify user role to create mock JWT for',
  })
  @IsString()
  userRole: UserRole;
}
