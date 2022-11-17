import { Controller, Get, HttpCode, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Roles } from './common/decorators/roles.decorator';
import { User } from './common/decorators/user.decorator';
import { UserRole } from './common/enums/role.enum';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';

@UseInterceptors(new TransformResponseInterceptor())
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  ping(): string {
    // used by Route53 to Heath Check.
    return this.appService.ping();
  }

  @Roles(UserRole.PATIENT)
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

  @Roles(UserRole.BENCHMARK)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Get('auth-check/benchmark')
  authCheckBenchmark(@User() userId: string) {
    return {
      status: 'success',
      role: 'benchmark',
      userId,
    };
  }

  @Roles(UserRole.THERAPIST)
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
