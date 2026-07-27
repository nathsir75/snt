export interface BatchTrainerAssignment {
  id: number;
  isPrimary: boolean;
  assignedAt: string;
  trainer: {
    id: number;
    fullName: string;
    email: string | null;
    specialization: string | null;
    trainerType: 'local' | 'global';
    isActive: boolean;
  };
  batch: {
    id: number;
    name: string;
    branch: { id: number; name: string };
  };
}

export interface AssignTrainerPayload {
  batchId: number;
  trainerId: number;
  isPrimary?: boolean;
}
