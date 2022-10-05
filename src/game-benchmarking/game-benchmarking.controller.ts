import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GameBenchmarkingService } from 'src/services/game-benchmarking/game-benchmarking.service';

@Controller('game-benchmarking')
export class GameBenchmarkingController {
  constructor(private gameBenchmarkingService: GameBenchmarkingService) {}

  // TODO: Generate Excel report.
  @Roles(Role.TESTER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Get('report')
  async generateReport(@Query('gameId') gameId: string, @Query('benchmarkId') benchmarkId: string) {
    return await this.gameBenchmarkingService.generateReport(gameId, benchmarkId);
  }
}
