import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { EventsService } from 'src/services/events/events.service';

@ApiBearerAuth('access-token')
@Controller('events/help-accessed')
export class HelpAccessedController {
  constructor(private eventsService: EventsService) {}

  @Post('soundhealth-faq')
  async soundHealthFaqAccessed(@User('id') userId: string) {
    await this.eventsService.faqAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }

  @Post('free-resources')
  async freeResourcesAccessed(@User('id') userId: string) {
    await this.eventsService.freeParkinsonResourceAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }

  @Post('free-reward-accessed')
  async freeRewardAccessed(@User('id') userId: string) {
    await this.eventsService.freeRewardAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }
}
