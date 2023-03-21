import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from 'src/database/database.service';
import { PhiService } from 'src/services/phi/phi.service';
import { PhiTokenizeBodyDTO } from './phi.dto';

@ApiBearerAuth('access-token')
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
        throw new Error('Invalid table name');
      }
      if (!['email', 'phoneNumber'].includes(key)) {
        throw new Error('Invalid column name');
      }

      const result = await this.phiService.upsertPII(event, key);

      if (!result || !result.id) {
        throw new Error('Failed to tokenize');
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
