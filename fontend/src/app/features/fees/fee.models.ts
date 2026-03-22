export type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';

export interface PaymentStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  finalFees: number;
}

export interface PaymentBranch {
  id: number;
  name: string;
  city: string;
}

export interface PaymentCollectedBy {
  id: number;
  name: string;
}

export interface FeePayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNo: string | null;
  remarks: string | null;
  createdAt: string;
  student: PaymentStudent;
  branch: PaymentBranch;
  collectedBy: PaymentCollectedBy;
}

// Ledger payment row (no student/branch nesting — student is the context)
export interface LedgerPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNo: string | null;
  remarks: string | null;
  collectedBy: PaymentCollectedBy;
}

export interface LedgerStudent {
  id: number;
  fullName: string;
  mobile: string;
  course: string;
  totalFees: number;
  discount: number;
  finalFees: number;
  branch: { id: number; name: string };
}

export interface StudentLedger {
  student: LedgerStudent;
  payments: LedgerPayment[];
  totalFees: number;
  totalPaid: number;
  remainingDue: number;
}

// collectPayment response
export interface CollectPaymentResult {
  payment: FeePayment;
  totalPaid: number;
  remainingDue: number;
}

// Request payload
export interface CollectPaymentPayload {
  studentId: number;
  amount: number;
  paymentMode: PaymentMode;
  referenceNo?: string;
  remarks?: string;
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash:          'Cash',
  upi:           'UPI',
  card:          'Card',
  bank_transfer: 'Bank Transfer',
};
