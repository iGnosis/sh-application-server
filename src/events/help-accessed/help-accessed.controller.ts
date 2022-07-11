import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserObj } from 'src/auth/decorators/userObj.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserObjDecorator } from 'src/types/user';
import { EventsService } from '../events.service';

@Roles(Role.PATIENT, Role.PLAYER)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('events/help-accessed')
export class HelpAccessedController {
  constructor(private eventsService: EventsService) { }

  @Post('soundhealth-faq')
  async soundHealthFaqAccessed(@UserObj() userObj: UserObjDecorator) {
    const { sub: userId } = userObj;
    await this.eventsService.faqAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }

  @Post('free-resources')
  async freeResourcesAccessed(@UserObj() userObj: UserObjDecorator) {
    const { sub: userId } = userObj;
    await this.eventsService.freeParkinsonResourceAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }

  @Post('free-reward-accessed')
  async freeRewardAccessed(@UserObj() userObj: UserObjDecorator) {
    const { sub: userId } = userObj;
    await this.eventsService.freeRewardAccessed(userId);
    return {
      status: 'success',
      data: {},
    };
  }
}
