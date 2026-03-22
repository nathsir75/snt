import { Request } from 'express';
import { Role } from './roles';

export interface AuthPayload {
  userId: number;
  role: Role;
  branchId: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
