import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PhiService } from 'src/services/phi/phi.service';
import { MaskPhiDto, PhiTokenizeBodyDTO, UpdatePhiColumnDto } from './phi.dto';
import { ConfigService } from '@nestjs/config';
import { validate as uuidValidate } from 'uuid';
import { maskPhone, maskEmail2 } from 'maskdata';
import { PiiDataType } from 'src/types/enum';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';

@UseInterceptors(new TransformResponseInterceptor())
@Controller('phi')
export class PhiController {
  ALLOWED_PII_COLUMNS = [
    'email',
    'phoneNumber',
    'firstName',
    'lastName',
    'nickname',
    'medicalConditions',
  ];
  ALLOWED_TABLES = ['patient'];

  constructor(
    private databaseService: DatabaseService,
    private phiService: PhiService,
    private configService: ConfigService,
    private logger: Logger,
  ) {}

  @HttpCode(200)
  @Post('tokenize/:column')
  async tokenizeColumn(@Body() body: UpdatePhiColumnDto, @Param('column') phiColumn: string) {
    const { event, table } = body;

    if (event.op !== 'UPDATE') {
      throw new HttpException(
        `Unauthorized event operation type [${event.op}]`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.ALLOWED_TABLES.includes(table.name)) {
      throw new HttpException(`Unauthorized table [${table.name}]`, HttpStatus.FORBIDDEN);
    }

    if (!this.ALLOWED_PII_COLUMNS.includes(phiColumn)) {
      throw new HttpException(`Unauthorized column to update [${phiColumn}]`, HttpStatus.FORBIDDEN);
    }

    // ID and Role of user who initated the 'INSERT' action.
    // defaults to 'system' -- when done using 'admin_secret'
    let actionUserRole = 'system';
    let actionUserId = '00000000-0000-0000-0000-000000000000';
    if (event && event.session_variables) {
      if (event.session_variables['x-hasura-role']) {
        actionUserRole = event['session_variables']['x-hasura-role'];
      }
      if (event.session_variables['x-hasura-user-id']) {
        actionUserId = event['session_variables']['x-hasura-user-id'];
      }
    }

    if (uuidValidate(event.data.new[phiColumn])) {
      return;
    }

    this.logger.log('[update] phiColumn:: ' + phiColumn);
    this.logger.log('[update] event.data.new:: ' + JSON.stringify(event.data.new));
    let record;
    if (!uuidValidate(event.data.old[phiColumn])) {
      record = await this.phiService.tokenize({
        recordType: phiColumn,
        recordData: {
          value: event.data.new[phiColumn],
        },
        organizationId: event.data.new['organizationId'] || '',
        patientId: event.data.new['id'],
        env: this.configService.get('ENV_NAME'),
      });
    } else {
      record = await this.phiService.updateHealthData({
        recordId: event.data.old[phiColumn],
        recordData: { value: event.data.new[phiColumn] },
      });
    }

    const sql = `UPDATE ${table.name} SET "${phiColumn}" = $1 WHERE id = $2`;
    await this.databaseService.executeQuery(sql, [record.id, event.data.new['id']]);

    await this.phiService.audit({
      operationType: event.op,
      healthRecordId: record.id,
      newRecord: { value: event.data.new[phiColumn] },
      organizationId: event.data.new['organizationId'] || '',
      modifiedByUser: actionUserId,
      userRole: actionUserRole,
      changeReason: event.data.new['lastPiiChangeReason'] || '',
    });

    this.logger.log('update: updated tokenized column: ' + phiColumn);
    return { success: true };
  }

  @HttpCode(200)
  @Post('tokenize')
  async tokenize(@Body() body: PhiTokenizeBodyDTO) {
    const { event, table } = body;

    if (event.op !== 'INSERT') {
      throw new HttpException(
        `Unauthorized event operation type [${event.op}]`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.ALLOWED_TABLES.includes(table.name)) {
      throw new HttpException(`Unauthorized table [${table.name}]`, HttpStatus.FORBIDDEN);
    }

    // ID and Role of user who initated the 'INSERT' action.
    // defaults to 'system' -- when done using 'admin_secret'
    let actionUserRole = 'system';
    let actionUserId = '00000000-0000-0000-0000-000000000000';
    if (event && event.session_variables) {
      if (event.session_variables['x-hasura-role']) {
        actionUserRole = event['session_variables']['x-hasura-role'];
      }
      if (event.session_variables['x-hasura-user-id']) {
        actionUserId = event['session_variables']['x-hasura-user-id'];
      }
    }

    for (const column in event.data.new) {
      if (!this.ALLOWED_PII_COLUMNS.includes(column)) {
        continue;
      }

      const record = await this.phiService.tokenize({
        recordType: column,
        recordData: {
          value: event.data.new[column],
        },
        organizationId: event.data.new['organizationId'] || '',
        patientId: event.data.new['id'],
        env: this.configService.get('ENV_NAME'),
      });

      const sql = `UPDATE ${table.name} SET "${column}" = $1 WHERE id = $2`;
      await this.databaseService.executeQuery(sql, [record.id, event.data.new['id']]);
      await this.phiService.audit({
        operationType: event.op,
        healthRecordId: record.id,
        newRecord: { value: event.data.new[column] },
        organizationId: event.data.new['organizationId'] || '',
        modifiedByUser: actionUserId,
        userRole: actionUserRole,
        changeReason: event.data.new['lastPiiChangeReason'] || '',
      });
      this.logger.log('insert: tokenized column:: ' + column);
    }

    return {
      success: true,
    };
  }

  @HttpCode(200)
  @Post('mask/:phiToken')
  async maskPhi(@Body() body: MaskPhiDto) {
    const { phiToken } = body;
    const data = await this.phiService.deTokenize(phiToken);
    let maskedData = '';

    switch (data.column) {
      case PiiDataType.EMAIL:
        maskedData = maskEmail2(data.value);
        break;

      case PiiDataType.PHONE_NUMBER:
        maskedData = maskPhone(data.value);
        break;

      case PiiDataType.NICKNAME:
      case PiiDataType.FIRST_NAME:
      case PiiDataType.LAST_NAME:
      default:
        maskedData = this.phiService.maskString(data.value);
        break;
    }

    // TODO: need to replace test values with actual values.
    // This is kept as TODO becuase we likely won't be using PointMotion JWTs.
    await this.phiService.readMaskedPhiAudit({
      healthRecordId: phiToken,
      userRole: 'test',
      organizationId: '00000000-0000-0000-0000-000000000000',
    });

    return maskedData;
  }
}
