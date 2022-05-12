import { Controller, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/services/guard/auth.guard";
import { CronService } from "./cron.service";

@Controller('cron')
@UseGuards(AuthGuard)
export class CronController {
  constructor(private cronService: CronService) { }

  @Put('sessions/trash')
  async trashSessions() {
    return this.cronService.trashSessions()
  }

  @Put('sessions/complete')
  async completeInactiveSessions() {
    return this.cronService.completeInactiveSessions()
  }
}
