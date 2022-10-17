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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ProviderChartsService } from 'src/services/provider-charts/provider-charts.service';
import {
  ChartType,
  GroupBy,
  PlotChartDTO,
  PlotHeatmapDTO,
  SortBy,
  SortDirection,
} from 'src/types/provider-charts';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';

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

    try {
      startDate = new Date(startDate);
      endDate = new Date(endDate);
    } catch (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
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
  }

  @HttpCode(200)
  @Get('patient-monthly-completion')
  async patientMonthlyCompletion(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @Query('sortBy') sortBy: SortBy,
    @Query('sortDirection') sortDirection: SortDirection,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query('showInactive') showInactive: boolean,
  ) {
    const query: PlotHeatmapDTO = {
      startDate,
      endDate,
      userTimezone,
      sortBy,
      sortDirection,
      limit,
      offset,
      showInactive,
    };
    const results = await this.providerChartsService.getPatientsCompletionHeatmap(query);
    return { results };
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
}
