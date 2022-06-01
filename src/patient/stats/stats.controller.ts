import { Controller, Get, HttpCode, Param } from '@nestjs/common';

@Controller('patient/stats')
export class StatsController {
  @HttpCode(200)
  @Get('monthly-goals/:month')
  async monthyGoals(@Param('month') month: number) {
    const monthyGoals = [
      {
        day: 1,
        sessions: [{ id: 'b8c59e0d-fcc6-43f1-a900-fff554dc60d9', status: 'completed' }],
      },
      {
        day: 2,
        sessions: [{ id: 'ec623a4a-a373-49b9-ab54-8848eb8a1a98', status: 'partiallycompleted' }],
      },
      {
        day: 3,
        sessions: [
          { id: '4fd24aca-435d-4989-b264-c7bfd505780c', status: 'completed' },
          { id: '989a4baa-4146-45ec-8800-3c5a55e8e654', status: 'partiallycompleted' },
        ],
      },
      {
        day: 4,
        sessions: [
          { id: '71bba372-0ae8-44ba-8f50-82c31d14bf74', status: 'completed' },
          { id: '0901b9ab-f96d-4248-b9a8-0f24333c6d83', status: 'partiallycompleted' },
          { id: 'd464462a-2f76-4d4b-8b3b-9d8a13ae1423', status: 'exceeded' },
        ],
      },
      {
        day: 5,
        sessions: [{ id: '7d98cd54-0111-4211-82a1-e3ec9e88f76a', status: 'partiallycompleted' }],
      },
      {
        day: 6,
        sessions: [],
      },
      {
        day: 7,
        sessions: [{ id: '6605fd16-477a-4a69-ba53-22318a7262ef', status: 'completed' }],
      },
    ];

    return monthyGoals;

    // return {
    //   data: monthyGoals,
    // };
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
