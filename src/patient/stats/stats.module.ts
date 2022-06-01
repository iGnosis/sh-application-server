import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller";

@Module({
  imports: [],
  controllers: [StatsController],
  providers: []
})
export class StatsModule { }
