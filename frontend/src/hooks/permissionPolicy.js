// Legacy sessions may omit grants. The API still authorizes each request.
const standardTelecallerPermissions = [
  'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
  'followups.view', 'followups.create', 'followups.edit', 'followups.complete',
  'customers.view', 'customers.create', 'customers.edit',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.process',
  'products.view', 'shipping.view', 'delivery.view'
];

export function permissionsForUser(user) {
  if (Array.isArray(user?.permissions)) return user.permissions;
  return user?.role === 'TELECALLER' ? standardTelecallerPermissions : [];
}

export function hasPermissionForUser(user, permission) {
  if (!permission) return true;
  if (user?.role === 'OWNER') return true;
  return permissionsForUser(user).includes(permission);
}
