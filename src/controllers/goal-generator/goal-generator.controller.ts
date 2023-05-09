import { Body, Controller, Logger, Post, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { GoalGeneratorService } from 'src/services/goal-generator/goal-generator.service';
import { GameName, Metrics } from 'src/types/enum';

@ApiBearerAuth('access-token')
@Controller('goal-generator')
@UseInterceptors(new TransformResponseInterceptor())
export class GoalGeneratorController {
  constructor(private goalGeneratorService: GoalGeneratorService, private logger: Logger) {}

  @Post('goal')
  async generateGoal(@User('id') patientId: string, @Body() body: { gameName: GameName }) {
    return await this.goalGeneratorService.generateGoals(patientId, body.gameName);
  }

  @Post('update-patient-context')
  async updatePatientContext(
    @User('id') patientId: string,
    @Body('metrics') metrics: { metrics: Metrics[] },
  ) {
    try {
      await this.goalGeneratorService.updatePatientContext(patientId, metrics.metrics);
    } catch (err) {
      this.logger.log('error while updating patient context: ' + JSON.stringify(err));
    }

    try {
      await this.goalGeneratorService.verifyGoalCompletion(patientId);
    } catch (err) {
      this.logger.log('error while verifyGoalCompletion: ' + JSON.stringify(err));
    }
    return 'success';
  }
}
