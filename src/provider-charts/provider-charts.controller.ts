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
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { ProviderChartsService } from 'src/services/provider-charts/provider-charts.service';
import { ChartType, GroupBy, PlotChartDTO, SortBy, SortDirection } from 'src/types/provider-charts';
import { groupBy as lodashGroupBy } from 'lodash';
import { StatsService } from 'src/patient/stats/stats.service';

@Roles(Role.THERAPIST)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('provider-charts')
@UseInterceptors(new TransformResponseInterceptor())
export class ProviderChartsController {
  constructor(
    private providerChartsService: ProviderChartsService,
    private statsService: StatsService,
  ) {}

  @HttpCode(200)
  @Get('/')
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  @ApiQuery({ name: 'isGroupByGames', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDirection', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'showInactive', required: false })
  async plotChart(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @Query('patientId') patientId: string,
    @Query('chartType') chartType: ChartType,
    @Query('groupBy') groupBy: GroupBy,
    @Query('isGroupByGames') isGroupByGames: boolean,
    @Query('sortBy') sortBy?: SortBy,
    @Query('sortDirection') sortDirection?: SortDirection,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('showInactive') showInactive?: boolean,
  ) {
    // input sanitization
    const validGroupByValues: GroupBy[] = ['day', 'week', 'month'];
    const validChartTypeValues: ChartType[] = [
      'avgAchievementRatio',
      'avgCompletionTime',
      'avgEngagementRatio',
      'patientsCompletionHeatmap',
    ];
    if (!validGroupByValues.includes(groupBy)) {
      throw new HttpException('Invalid groupBy value', HttpStatus.BAD_REQUEST);
    }
    if (!validChartTypeValues.includes(chartType)) {
      throw new HttpException('Invalid chartType value', HttpStatus.BAD_REQUEST);
    }

    // to make endDate inclusive.
    endDate = this.statsService.getFutureDate(endDate, 1);

    // there must be tranformer pipes to do this...
    const query: PlotChartDTO = {
      startDate,
      endDate,
      userTimezone,
      patientId,
      chartType,
      groupBy,
      isGroupByGames,
      sortBy,
      sortDirection,
      limit,
      offset,
      showInactive,
    };

    if (chartType === 'avgAchievementRatio') {
      const results = await this.providerChartsService.getPatientAvgAchievement(query);
      return { results };
      // const groupedByResults = lodashGroupBy(results, 'createdAt');
      // const labels = Object.keys(groupedByResults).map(val => new Date(val).toISOString())
    }

    if (chartType === 'avgCompletionTime') {
      const results = await this.providerChartsService.getPatientAvgCompletionTime(query);
      return { results };
    }

    if (chartType === 'avgEngagementRatio') {
      const results = await this.providerChartsService.getPatientAvgEngagement(query);
      return { results };
    }

    if (chartType === 'patientsCompletionHeatmap') {
      const results = await this.providerChartsService.getPatientsCompletionHeatmap(query);
      return { results };
    }
  }

  @HttpCode(200)
  @Get('game-achievement-ratio')
  async gameAchievementRatio(@Query('gameId') gameId: string) {
    return this.providerChartsService.getGameAchievementRatio(gameId);
  }

  @HttpCode(200)
  @Get('patient-overview')
  async patientOverview(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date) {
    return this.statsService.getPatientOverview(startDate, endDate);
  }

  @HttpCode(200)
  @Get('patient-adherence')
  async patientAdherence(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('groupBy') groupBy: GroupBy,
  ) {
    const results = await this.providerChartsService.getAdheranceChart(startDate, endDate, groupBy);
    const totalNumOfPatients = await this.statsService.getTotalPatientCount();
    const activePatientsCount = results.length;
    return { activePatientsCount, totalNumOfPatients };
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
    const results = await this.providerChartsService.getPatientEngagementTemp(
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
