import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

export class RbacService {
  /**
   * Get all effective permissions for a role
   */
  static async getPermissionsForRole(roleName) {
    if (roleName === ROLES.OWNER) {
      return Object.values(PERMISSIONS);
    }

    const role = await Role.findOne({ name: roleName.toUpperCase() }).lean();
    if (role && role.permissions && role.permissions.length > 0) {
      return role.permissions;
    }

    // Fallback to default role permissions
    return DEFAULT_ROLE_PERMISSIONS[roleName] || [];
  }

  /**
   * Check if a role possesses a specific permission
   */
  static async hasPermission(roleName, requiredPermission) {
    if (roleName === ROLES.OWNER) return true;
    const permissions = await this.getPermissionsForRole(roleName);
    return permissions.includes(requiredPermission);
  }

  /**
   * Ensure default roles and permissions exist in database
   */
  static async initializeDefaultRoles() {
    // 1. Seed all permissions
    const permissionDocs = Object.entries(PERMISSIONS).map(([key, code]) => {
      const moduleName = code.split('.')[0];
      return {
        code,
        module: moduleName,
        description: `Permission to perform ${code}`
      };
    });

    for (const perm of permissionDocs) {
      await Permission.findOneAndUpdate({ code: perm.code }, perm, { upsert: true });
    }

    // 2. Seed default roles
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await Role.findOneAndUpdate(
        { name: roleName },
        {
          name: roleName,
          description: `Default system role: ${roleName}`,
          permissions,
          isSystemRole: true
        },
        { upsert: true }
      );
    }
  }
}

export default RbacService;
