import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PhiService } from 'src/services/phi/phi.service';
import { PhiTokenizeBodyDTO } from './phi.dto';

@Controller('phi')
export class PhiController {
  constructor(private databaseService: DatabaseService, private phiService: PhiService) {}

  @HttpCode(200)
  @Post('tokenize')
  async tokenize(@Body() body: PhiTokenizeBodyDTO) {
    const { event, table, userId } = body;
    const tableName = table.name;

    for (const key in event.data.new) {
      if (!this.phiService.hasValueChanged(event.data.new, event.data.old, key)) {
        continue;
      }
      if (!['patient'].includes(tableName)) {
        throw new HttpException('Invalid table name', HttpStatus.BAD_REQUEST);
      }
      if (!['email', 'phoneNumber'].includes(key)) {
        throw new HttpException('Invalid column name', HttpStatus.BAD_REQUEST);
      }

      const result = await this.phiService.upsertPII(event, key);

      if (!result || !result.id) {
        throw new HttpException('Failed to tokenize', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      await this.phiService.audit({
        operationType: event.op,
        healthRecordId: result.id,
        newRecord: { value: event.data.new[key] },
        organizationId: event.session_variables['x-hasura-organization-id'],
        modifiedByUser: userId,
        userRole: event.session_variables['x-hasura-role'],
      });

      const sql = `UPDATE ${tableName} SET "${key}" = $1 WHERE id = $2`;
      await this.databaseService.executeQuery(sql, [result.id, event.data.new['id']]);
    }
    return {
      status: 'success',
    };
  }
}
