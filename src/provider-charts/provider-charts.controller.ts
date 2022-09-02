import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { ProviderChartsService } from 'src/services/provider-charts/provider-charts.service';
import { ChartType, GroupBy, PlotChartDTO } from 'src/types/provider-charts';

@Roles(Role.THERAPIST)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('provider-charts')
@UseInterceptors(new TransformResponseInterceptor())
export class ProviderChartsController {
  constructor(private providerChartsService: ProviderChartsService) {}

  @HttpCode(200)
  @Get('/')
  async plotChart(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @Query('patientId') patientId: string,
    @Query('chartType') chartType: ChartType,
    @Query('groupBy') groupBy: GroupBy,
    @Query('isGroupByGames') isGroupByGames: boolean,
  ) {
    // input sanitization
    const validGroupByValues: GroupBy[] = ['day', 'week', 'month'];
    const validChartTypeValues: ChartType[] = [
      'avgAchievementRatio',
      'avgCompletionTime',
      'avgEngagementRatio',
    ];
    if (!validGroupByValues.includes(groupBy)) {
      throw new HttpException('Invalid groupBy value', HttpStatus.BAD_REQUEST);
    }
    if (!validChartTypeValues.includes(chartType)) {
      throw new HttpException('Invalid chartType value', HttpStatus.BAD_REQUEST);
    }

    // there must be tranformer pipes to do this...
    const query: PlotChartDTO = {
      startDate,
      endDate,
      userTimezone,
      patientId,
      chartType,
      groupBy,
      isGroupByGames,
    };

    if (chartType === 'avgAchievementRatio') {
      const results = await this.providerChartsService.getPatientAvgAchievement(query);
      return { results };
    }

    if (chartType === 'avgCompletionTime') {
      const results = await this.providerChartsService.getPatientAvgCompletionTime(query);
      return { results };
    }

    if (chartType === 'avgEngagementRatio') {
      throw new HttpException('To be implemented.', HttpStatus.NOT_IMPLEMENTED);
    }
  }

  // TODO: remove this API, and instead use a generic one.
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
