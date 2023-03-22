import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { isEqual } from 'lodash';

@Injectable()
export class PhiService {
  constructor(private gqlService: GqlService) {}

  async tokenize(payload: {
    recordType: string;
    recordData: { value: string };
    organizationId: string;
    patientId: string;
  }) {
    try {
      const mutation = `mutation InsertHealthRecords($recordType: String, $recordData: jsonb, $organizationId: uuid, $patientId: uuid!) {
        insert_health_records(objects: {recordType: $recordType, recordData: $recordData, organizationId: $organizationId, patient: $patientId}) {
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

  async deTokenize(recordId: string) {
    try {
      const query = `query Detokenize($recordId: uuid!) {
        health_records_by_pk(id: $recordId) {
          recordData(path: "value")
        }
      }`;
      const result = await this.gqlService.client.request(query, { recordId });
      return result.health_records_by_pk.recordData;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
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
      const mutation = `
        mutation InsertAudit($operationType: String, $healthRecordId: uuid, $newRecord: jsonb, $oldRecord: uuid, $organizationId: uuid, $modifiedByUser: uuid = "", $userRole: String) {
            insert_audit(objects: {operationType: $operationType, healthRecordId: $healthRecordId, newRecord: $newRecord, oldRecord: $oldRecord, organizationId: $organizationId, modifiedByUser: $modifiedByUser, userRole: $userRole}) {
              affected_rows
            }
        }`;

      const result = await this.gqlService.client.request(mutation, payload);
      return result.insert_audit;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  async upsertPII(event: { [key: string]: any }, key: string, patientId: string) {
    const shouldUpdatePII = event.op === 'UPDATE' && this.isUuid(event.data.old[key]);
    if (shouldUpdatePII) {
      return this.updateHealthData({
        recordId: event.data.old[key],
        recordData: { value: event.data.new[key] },
      });
    } else {
      return this.tokenize({
        recordType: key,
        recordData: { value: event.data.new[key] },
        organizationId: event.session_variables['x-hasura-organization-id'],
        patientId,
      });
    }
  }
}
