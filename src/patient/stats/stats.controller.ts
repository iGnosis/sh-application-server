import { Controller, Get, HttpCode, Param } from '@nestjs/common';

@Controller('patient/stats')
export class StatsController {
  @HttpCode(200)
  @Get('monthly-goals/:month')
  async monthyGoals(@Param('month') month: number) {
    return {
      1: {
        'b8c59e0d-fcc6-43f1-a900-fff554dc60d9': 'completed',
      },
      2: {
        'ec623a4a-a373-49b9-ab54-8848eb8a1a98': 'partiallycompleted',
      },
      3: {
        '4fd24aca-435d-4989-b264-c7bfd505780c': 'completed',
        '989a4baa-4146-45ec-8800-3c5a55e8e654': 'partiallycompleted',
      },
      4: {
        '71bba372-0ae8-44ba-8f50-82c31d14bf74': 'completed',
        '0901b9ab-f96d-4248-b9a8-0f24333c6d83': 'partiallycompleted',
        'd464462a-2f76-4d4b-8b3b-9d8a13ae1423': 'exceeded',
      },
      5: {
        '7d98cd54-0111-4211-82a1-e3ec9e88f76a': 'partiallycompleted',
      },
    };
  }

  @HttpCode(200)
  @Get('daily-goals/:day')
  async dailyGoals(@Param('day') day: number) {
    // returns the number of minutes a patient did a session on said day. can be >30min
    return 21;
  }

  @HttpCode(200)
  @Get('streak')
  async streak() {
    // returns the number of days a patient did sessions consecutively.
    return 4;
  }
}
