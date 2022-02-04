import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GqlService } from './services/gql/gql.service';
import { AuthService } from './services/auth/auth.service';
import { JwtService } from './services/jwt/jwt.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true
    })
  ],
  controllers: [AppController],
  providers: [AppService, GqlService, AuthService, JwtService],
})
export class AppModule {}
