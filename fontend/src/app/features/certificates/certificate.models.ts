export type CertificateStatus = 'issued' | 'revoked';

export interface CertStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
}

export interface CertBranch {
  id: number;
  name: string;
  city: string;
}

export interface CertIssuedBy {
  id: number;
  name: string;
}

export interface CertResult {
  id: number;
  marksObtained: number;
  maxMarks: number;
  resultStatus: string;
  publishedAt: string | null;
}

export interface Certificate {
  id: number;
  certificateNo: string;
  verificationCode: string;
  issueDate: string;
  status: CertificateStatus;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
  student: CertStudent;
  branch: CertBranch;
  issuedBy: CertIssuedBy;
  result: CertResult | null;
}

export interface IssueCertificatePayload {
  resultId: number;
}

export interface RevokeCertificatePayload {
  reason: string;
}

// Public verification response (no auth)
export interface CertVerifyResult {
  certificateNo: string;
  studentName: string;
  course: string;
  issueDate: string;
  status: CertificateStatus;
}
