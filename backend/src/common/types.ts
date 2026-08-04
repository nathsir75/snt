import { Request } from 'express';
import { Role } from './roles';

export interface AuthPayload {
  userId: number;
  role: Role;
  branchId: number | null;
  scope?: 'global' | 'branch';
  mustChangePassword?: boolean;
  iat?: number;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
