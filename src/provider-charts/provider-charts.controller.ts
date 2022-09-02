import { Controller, Get, HttpCode, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { ProviderChartsService } from 'src/services/provider-charts/provider-charts.service';

@Roles(Role.THERAPIST)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('provider-charts')
@UseInterceptors(new TransformResponseInterceptor())
export class ProviderChartsController {
  constructor(private providerChartsService: ProviderChartsService) {}

  @HttpCode(200)
  @Get('patient/engagement-ratio')
  async getPatientEngagement(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @Query('patientId') patientId: string,
  ) {
    const results = await this.providerChartsService.getPatientEngagement(
      patientId,
      startDate,
      endDate,
      userTimezone,
    );

    console.log('getPatientEngagement:results:', results);

    return {
      ...results,
    };
  }
}
