export function usePermissions(user) {
  if (!user) return { canManageUsers: false, canManageBenchmarks: false, canCreatePlans: false, canEditPlans: false, canExport: false, canViewOnly: false };
  
  const role = user.role || 'consultant';
  
  return {
    canManageUsers: role === 'admin',
    canManageBenchmarks: role === 'admin',
    canCreatePlans: role === 'admin' || role === 'consultant',
    canEditPlans: role === 'admin' || role === 'consultant',
    canExport: role === 'admin' || role === 'consultant' || role === 'client',
    canViewOnly: role === 'client',
  };
}