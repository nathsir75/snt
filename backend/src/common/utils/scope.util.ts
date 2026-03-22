import { AuthPayload } from '../types';
import { ROLES, BRANCH_ROLES, Role } from '../roles';

export function isSuperAdmin(role: Role | string): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function isBranchScoped(role: Role | string): boolean {
  return BRANCH_ROLES.includes(role as Role);
}

export function hasRole(role: Role | string, ...allowed: Role[]): boolean {
  return allowed.includes(role as Role);
}

export function getBranchFilter(user: AuthPayload): { branchId?: number } {
  if (isSuperAdmin(user.role)) {
    console.log('[Scope] super_admin bypass — no branch filter applied');
    return {};
  }
  console.log(`[Scope] Branch filter applied for role: ${user.role}, branchId: ${user.branchId}`);
  return { branchId: user.branchId as number };
}
