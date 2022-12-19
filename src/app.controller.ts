import { Controller, Get, HttpException, HttpStatus, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
@UseInterceptors(new TransformResponseInterceptor())
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  // used by Route53 to Heath Check.
  @Get('')
  ping(): string {
    return this.appService.ping();
  }
}
