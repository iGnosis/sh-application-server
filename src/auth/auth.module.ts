import { Module } from '@nestjs/common';
import { AuthService } from 'src/services/auth/auth.service';
import { GqlService } from 'src/services/gql/gql.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GqlService, JwtService]
})
export class AuthModule {}
