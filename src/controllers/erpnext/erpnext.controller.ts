import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { ErpnextService } from 'src/services/erpnext/erpnext.service';
import { IssueDto } from './erpnext.dto';

@UseInterceptors(new TransformResponseInterceptor())
@Controller('erpnext')
export class ErpnextController {
  constructor(private erpnextService: ErpnextService) {}

  @Post('issue')
  createIssue(@Body() body: IssueDto) {
    return this.erpnextService.createIssue(body.subject, body.description, body.email);
  }
}
