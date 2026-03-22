// ── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  name: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  industry?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
}

// ── Job Opening ───────────────────────────────────────────────────────────────

export type JobStatus = 'open' | 'closed';

export interface JobCompany {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
}

export interface JobOpening {
  id: number;
  title: string;
  description: string | null;
  requiredSkills: string | null;
  salaryPackage: number | null;
  location: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  company: JobCompany;
}

export interface CreateJobPayload {
  companyId: number;
  title: string;
  description?: string;
  requiredSkills?: string;
  salaryPackage?: number;
  location?: string;
}
