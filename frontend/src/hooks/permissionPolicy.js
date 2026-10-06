// Legacy sessions may omit grants. The API still authorizes each request.
const standardTelecallerPermissions = [
  'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
  'followups.view', 'followups.create', 'followups.edit', 'followups.complete',
  'customers.view', 'customers.create', 'customers.edit',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.process',
  'products.view', 'shipping.view', 'delivery.view'
];

const standardManagerPermissions = [
  'leads.view', 'leads.create', 'leads.edit', 'leads.delete', 'leads.assign', 'leads.reassign',
  'followups.view',
  'customers.view', 'customers.create', 'customers.edit',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.verify', 'orders.process', 'orders.pack', 'orders.dispatch', 'orders.cancel',
  'products.view',
  'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.transfer',
  'operations.view',
  'shipping.view', 'shipping.manage',
  'delivery.view', 'delivery.manage',
  'rto.view', 'rto.manage', 'rto.verify',
  'reports.view', 'reports.export',
  'users.view'
];

const standardDistributorPermissions = [
  'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
  'followups.view',
  'customers.view', 'customers.create', 'customers.edit',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete',
  'products.view',
  'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.transfer',
  'shipping.view', 'delivery.view', 'rto.view',
  'reports.view', 'reports.export',
  'users.view'
];

export function permissionsForUser(user) {
  if (Array.isArray(user?.permissions)) return user.permissions;
  if (user?.role === 'TELECALLER') return standardTelecallerPermissions;
  if (user?.role === 'MANAGER') return standardManagerPermissions;
  if (user?.role === 'DISTRIBUTOR') return standardDistributorPermissions;
  return [];
}

export function hasPermissionForUser(user, permission) {
  if (!permission) return true;
  if (user?.role === 'OWNER') return true;
  return permissionsForUser(user).includes(permission);
}
