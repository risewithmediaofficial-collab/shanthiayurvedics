import { useAuth } from '../context/AuthContext.jsx';
import { hasPermissionForUser, permissionsForUser } from './permissionPolicy.js';

export function usePermissions() {
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';
  const isDistributor = user?.role === 'DISTRIBUTOR';
  const isManager = user?.role === 'MANAGER';
  const isTelecaller = user?.role === 'TELECALLER';

  const userPermissions = permissionsForUser(user);

  const hasPermission = (permission) => {
    return hasPermissionForUser(user, permission);
  };

  const hasAnyPermission = (permissions = []) => {
    if (!permissions || permissions.length === 0) return true;
    if (isOwner) return true;
    return permissions.some((perm) => userPermissions.includes(perm));
  };

  const hasAllPermissions = (permissions = []) => {
    if (!permissions || permissions.length === 0) return true;
    if (isOwner) return true;
    return permissions.every((perm) => userPermissions.includes(perm));
  };

  return {
    user,
    role: user?.role,
    isOwner,
    isDistributor,
    isManager,
    isTelecaller,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: userPermissions
  };
}

export default usePermissions;
