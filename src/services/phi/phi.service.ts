import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { PiiDataType } from 'src/types/enum';

@Injectable()
export class PhiService {
  constructor(private gqlService: GqlService) {}

  async tokenize(payload: {
    recordType: string;
    recordData: { value: any };
    organizationId: string;
    patientId: string;
    env: string;
  }) {
    try {
      const mutation = `mutation InsertHealthRecords($recordType: String, $recordData: jsonb, $organizationId: uuid, $patientId: uuid!, $env: String!) {
        insert_health_records(objects: {recordType: $recordType, recordData: $recordData, organizationId: $organizationId, patient: $patientId, env: $env}) {
          returning {
            id
          }
        }
      }`;
      const result = await this.gqlService.client.request(mutation, payload);
      return result.insert_health_records.returning[0];
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateHealthData(payload: { recordId: string; recordData: { value: string } }) {
    try {
      const mutation = `
        mutation UpdateHealthRecords($recordId: uuid!, $recordData: jsonb!) {
            update_health_records_by_pk(pk_columns: {id: $recordId}, _set: {recordData: $recordData}) {
              id
            }
        }`;
      const result = await this.gqlService.client.request(mutation, payload);
      return result.update_health_records_by_pk;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deTokenize(recordId: string): Promise<{
    column: PiiDataType;
    value: string;
  }> {
    try {
      const query = `query Detokenize($recordId: uuid!) {
        health_records_by_pk(id: $recordId) {
          column: recordType
          value: recordData(path: "value")
        }
      }`;
      const result = await this.gqlService.client.request(query, { recordId });
      return result.health_records_by_pk;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async readMaskedPhiAudit(payload: {
    healthRecordId: string;
    userRole: string;
    organizationId: string;
  }) {
    payload['operationType'] = 'READ_MASKED';

    const query = `mutation InsertMaskedReadAudit($operationType: String!, $healthRecordId: uuid!, $organizationId: uuid!, $userRole: String!) {
      insert_audit(objects: {operationType: $operationType, healthRecordId: $healthRecordId, organizationId: $organizationId, userRole: $userRole}) {
        affected_rows
      }
    }`;

    try {
      return await this.gqlService.client.request(query, payload);
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Error while calling [readMaskedPhiAudit]',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async audit(payload: {
    operationType: string;
    healthRecordId: string;
    newRecord: { value: string };
    oldRecord?: string;
    organizationId: string;
    modifiedByUser: string;
    userRole: string;
    changeReason: string;
  }) {
    try {
      const query = `
        query GetAudit($healthRecordId: uuid = "") {
            audit(where: {healthRecordId: {_eq: $healthRecordId}}, order_by: {createdAt: desc}) {
              id
            }
        }`;
      const res = await this.gqlService.client.request(query, {
        healthRecordId: payload.healthRecordId,
      });

      if (res.audit.length > 0) {
        payload.oldRecord = res.audit[0].id;
      }
      const inserAuditQuery = `mutation InsertAudit($operationType: String, $healthRecordId: uuid, $newRecord: jsonb, $oldRecord: uuid, $organizationId: uuid, $modifiedByUser: uuid = "", $userRole: String, $changeReason: String = "") {
        insert_audit(objects: {operationType: $operationType, healthRecordId: $healthRecordId, newRecord: $newRecord, oldRecord: $oldRecord, organizationId: $organizationId, modifiedByUser: $modifiedByUser, userRole: $userRole, changeReason: $changeReason}) {
          affected_rows
        }
      }`;
      const result = await this.gqlService.client.request(inserAuditQuery, payload);
      return result.insert_audit;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  maskString(str: string): string {
    if (str.length === 0) {
      return str;
    }

    const totalLength = str.length;
    const start = Math.floor((totalLength - 1) / 3);
    const end = Math.ceil((2 * (totalLength - 1)) / 3);

    const maskedChars = str.slice(start, end + 1).replace(/./g, '*');
    const maskedString = str.slice(0, start) + maskedChars + str.slice(end + 1);

    return maskedString;
  }
}
