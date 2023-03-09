import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/types/enums/enum';
import axios from 'axios';

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
      table.table = table.table.name;

      const permissionTypes = [
        'select_permissions',
        'insert_permissions',
        'update_permissions',
        'delete_permissions',
      ];

      permissionTypes.forEach((permissionType) => {
        if (Object.keys(table).includes(permissionType)) {
          table[permissionType] = table[permissionType].filter((table) => table.role === userRole);

          // delete permissions are always row-level
          if (permissionType === 'delete_permissions') {
            // eg. { delete_permissions: true }
            table[permissionType] = true;
          } else {
            // eg. { select_permissions: ["column1", "column2", ...] }
            table[permissionType] = table[permissionType]
              .map((perm) => perm.permission.columns)
              .flat();
          }

          // when no columns present for a permission type, delete that type for a clean response
          if (table[permissionType].length === 0) delete table[permissionType];
        }
      });

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
