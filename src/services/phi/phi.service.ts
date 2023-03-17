import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';

@Injectable()
export class PhiService {
  constructor(private gqlService: GqlService) {}

  async tokenize(payload: {
    recordType: string;
    recordData: { value: string };
    organizationId?: string;
  }) {
    try {
      const mutation = `
        mutation InsertHealthRecords($recordType: String, $recordData: jsonb, $organizationId: uuid) {
            insert_health_records(objects: {recordType: $recordType, recordData: $recordData, organizationId: $organizationId}) {
                returning {
                    id
                }
            }
        }`;
      const result = await this.gqlService.client.request(mutation, payload);
      return result.insert_health_records.returning[0];
    } catch (error) {
      console.log(error);
      throw new Error(error);
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
      throw new Error(error);
    }
  }

  async deTokenize(recordIds: string[]) {
    try {
      const query = `
        query GetHealthRecords($recordIds: [uuid!] = []) {
            health_records(where: {id: {_in: $recordIds}}) {
              recordData(path: "value")
            }
          }`;
      const result = await this.gqlService.client.request(query, {
        recordIds,
      });
      return result.health_records.map((record) => record.recordData);
    } catch (error) {
      console.log(error);
      throw new Error(error);
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
        mutation InsertAudit($operationType: String, $healthRecordId: uuid, $newRecord: jsonb, $oldRecord: uuid, $organizationId: uuid, $modifiedByUser: uuid, $userRole: String) {
            insert_audit(objects: {operationType: $operationType, healthRecordId: $healthRecordId, newRecord: $newRecord, oldRecord: $oldRecord, organizationId: $organizationId, modifiedByUser: $modifiedByUser, userRole: $userRole}) {
              affected_rows
            }
        }`;

      const result = await this.gqlService.client.request(mutation, payload);
      return result.insert_audit;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
}
