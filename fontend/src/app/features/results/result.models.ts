export type ResultStatus = 'pass' | 'fail' | 'absent';

export interface ResultStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
}

export interface ResultBranch {
  id: number;
  name: string;
  city: string;
}

export interface ResultPublishedBy {
  id: number;
  name: string;
}

export interface ResultRegistration {
  id: number;
  status: string;
  examDate: string | null;
  hallTicketNo: string | null;
}

export interface FinalResult {
  id: number;
  marksObtained: number;
  maxMarks: number;
  resultStatus: ResultStatus;
  remarks: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  student: ResultStudent;
  branch: ResultBranch;
  publishedBy: ResultPublishedBy | null;
  registration: ResultRegistration | null;
}

export interface PublishResultPayload {
  registrationId: number;
  marksObtained: number;
  maxMarks: number;
  remarks?: string;
}

export interface ResultSummary {
  totalResults: number;
  pass: number;
  fail: number;
  absent: number;
}
