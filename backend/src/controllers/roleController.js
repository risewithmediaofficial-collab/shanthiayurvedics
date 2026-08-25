import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ name: 1 }).lean();
  return ApiResponse.success(res, roles, 'Roles retrieved successfully');
});

export const getPermissions = asyncHandler(async (req, res) => {
  const permissions = await Permission.find().sort({ module: 1, code: 1 }).lean();
  return ApiResponse.success(res, permissions, 'Permissions retrieved successfully');
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { roleName } = req.params;
  const { permissions, description } = req.body;

  const role = await Role.findOne({ name: roleName.toUpperCase() });
  if (!role) {
    throw new NotFoundError('Role');
  }

  const oldValue = role.toObject();
  if (Array.isArray(permissions)) {
    role.permissions = permissions;
  }
  if (description) {
    role.description = description;
  }

  await role.save();

  await AuditService.log({
    userId: req.user.id,
    action: 'ROLE_PERMISSIONS_UPDATED',
    module: 'roles',
    resourceType: 'Role',
    resourceId: role._id,
    oldValue,
    newValue: role.toObject(),
    req
  });

  return ApiResponse.success(res, role, 'Role permissions updated successfully');
});
