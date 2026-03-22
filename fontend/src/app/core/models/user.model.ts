export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  COUNSELOR:    'counselor',
  TEACHER:      'teacher',
  STUDENT:      'student',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Roles that land in /ho (Head Office) */
export const HO_ROLES: Role[] = [ROLES.SUPER_ADMIN];

/** Roles that land in /branch */
export const BRANCH_ROLES: Role[] = [ROLES.BRANCH_ADMIN, ROLES.COUNSELOR];

export interface Branch {
  id: number;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  branchId: number | null;
  branch: Branch | null;
  isActive: boolean;
}

/**
 * Returns the post-login landing route for a given role.
 * counselor lands on /branch/enquiries (their primary daily task).
 */
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:  return '/ho/dashboard';
    case ROLES.BRANCH_ADMIN: return '/branch/dashboard';
    case ROLES.COUNSELOR:    return '/branch/enquiries';
    case ROLES.TEACHER:      return '/teacher/dashboard';
    case ROLES.STUDENT:      return '/student/dashboard';
  }
}
