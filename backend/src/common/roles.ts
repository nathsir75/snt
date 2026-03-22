export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  COUNSELOR:    'counselor',
  TEACHER:      'teacher',
  STUDENT:      'student',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Roles that operate within a branch scope */
export const BRANCH_ROLES: Role[] = [ROLES.BRANCH_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER, ROLES.STUDENT];

/** Roles that can manage branch operations (admin panel) */
export const BRANCH_ADMIN_ROLES: Role[] = [ROLES.BRANCH_ADMIN, ROLES.COUNSELOR];
