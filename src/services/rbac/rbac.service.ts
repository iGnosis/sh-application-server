import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enums/role.enum';
import axios from 'axios';
import { GqlService } from '../clients/gql/gql.service';

@Injectable()
export class RbacService {
  constructor(private configService: ConfigService) {}

  async exportHasuraMetadata() {
    const resp = await axios({
      method: 'post',
      url: this.configService.get('HASURA_METADATA_ENDPOINT'),
      data: {
        type: 'export_metadata',
        args: {},
      },
      headers: {
        'X-Hasura-Admin-Secret': this.configService.get('GQL_API_ADMIN_SECRET'),
      },
    });
    return resp.data;
  }

  filterHasuraMetadata(metadata: any, userRole: UserRole) {
    metadata.sources[0].tables.forEach((table, index: number) => {
      if (table.select_permissions) {
        table.select_permissions = table.select_permissions.filter(
          (table) => table.role === userRole,
        );
        if (table.select_permissions.length === 0) delete table.select_permissions;
      }
      if (table.update_permissions) {
        table.update_permissions = table.update_permissions.filter(
          (table) => table.role === userRole,
        );
        if (table.update_permissions.length === 0) delete table.update_permissions;
      }
      if (table.insert_permissions) {
        table.insert_permissions = table.insert_permissions.filter(
          (table) => table.role === userRole,
        );
        if (table.insert_permissions.length === 0) delete table.insert_permissions;
      }
      if (table.delete_permissions) {
        table.delete_permissions = table.delete_permissions.filter(
          (table) => table.role === 'patient',
        );
        if (table.delete_permissions.length === 0) delete table.delete_permissions;
      }

      // info not necessary
      delete table.table.schema;
      delete table.event_triggers;
      delete table.object_relationships;
      delete table.array_relationships;

      // delete enum tables
      if (table.is_enum) {
        delete metadata.sources[0].tables[index];
      }
    });

    const tableRbacNonNulls = metadata.sources[0].tables.filter((table) => table);
    const tableRbacKeepRelevantTables = tableRbacNonNulls.filter(
      (table) => Object.keys(table).length !== 1,
    );

    return tableRbacKeepRelevantTables;
  }
}
