import { Controller, Get, HttpCode, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Roles } from './auth/decorators/roles.decorator';
import { User } from './auth/decorators/user.decorator';
import { Role } from './auth/enums/role.enum';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TransformResponseInterceptor } from './interceptor/transform-response.interceptor';

@UseInterceptors(new TransformResponseInterceptor())
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Get('auth-check/patient')
  authCheckPatient(@User() userId: string) {
    return {
      status: 'success',
      role: 'patient',
      userId,
    };
  }

  @Roles(Role.THERAPIST)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Get('auth-check/therapist')
  authCheckTherapist(@User() userId: string) {
    return {
      status: 'success',
      role: 'therapist',
      userId,
    };
  }
}
