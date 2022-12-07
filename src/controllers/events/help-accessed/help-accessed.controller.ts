import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { EventsService } from 'src/services/events/events.service';

@Roles(UserRole.PATIENT, UserRole.BENCHMARK)
@UseGuards(AuthGuard, RolesGuard)
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
