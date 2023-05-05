import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { GoalGeneratorService } from 'src/services/goal-generator/goal-generator.service';
import { GameName, Metrics } from 'src/types/enum';

@Controller('goal-generator')
@UseInterceptors(new TransformResponseInterceptor())
export class GoalGeneratorController {
  constructor(private goalGeneratorService: GoalGeneratorService) {}

  @Post('goal')
  async generateGoal(@User('id') patientId: string, @Body('gameName') game: GameName) {
    return await this.goalGeneratorService.generateGoals(patientId, game);
  }

  @Post('update-patient-context')
  async updatePatientContext(@User('id') patientId: string, @Body('metrics') metrics: Metrics[]) {
    await this.goalGeneratorService.updatePatientContext(patientId, metrics);
    await this.goalGeneratorService.verifyGoalCompletion(patientId);
    return 'success';
  }
}
