import { Body, Controller, Post } from '@nestjs/common';
import { ErpnextService } from 'src/services/erpnext/erpnext.service';
import { IssueDto } from './erpnext.dto';

@Controller('erpnext')
export class ErpnextController {
  constructor(private erpnextService: ErpnextService) {}

  @Post('issue')
  createIssue(@Body() body: IssueDto) {
    return this.erpnextService.createIssue(body.subject, body.description, body.email);
  }
}
