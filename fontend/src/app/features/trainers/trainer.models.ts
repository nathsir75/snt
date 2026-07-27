export interface TrainerBranch {
  id: number;
  name: string;
  city: string;
}

export interface Trainer {
  id: number;
  fullName: string;
  email: string | null;
  mobile: string | null;
  specialization: string | null;
  trainerType: 'local' | 'global';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch: TrainerBranch;
}

export interface CreateTrainerPayload {
  fullName: string;
  branchId: number;
  email?: string;
  mobile?: string;
  specialization?: string;
  trainerType?: 'local' | 'global';
}

export interface BranchOption {
  id: number;
  name: string;
  city: string;
}
