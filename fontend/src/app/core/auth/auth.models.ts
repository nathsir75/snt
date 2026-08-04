import { User } from '../models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
  /** Optional — passed when login originates from a branch public site */
  branchCode?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Shape of the decoded JWT payload — must match backend jwt.sign() call */
export interface TokenPayload {
  userId: number;
  role: string;
  scope: 'global' | 'branch';
  branchId: number | null;
  mustChangePassword?: boolean;
  iat: number;
  exp: number;
}
