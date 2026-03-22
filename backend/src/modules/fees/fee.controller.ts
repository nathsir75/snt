import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { feeService } from './fee.service';

const ERROR_MAP: Record<string, [number, string]> = {
  STUDENT_NOT_FOUND:    [404, 'Student not found'],
  ACCESS_DENIED:        [403, 'Access denied. This student does not belong to your branch'],
  INVALID_AMOUNT:       [400, 'amount must be greater than 0'],
  INVALID_PAYMENT_MODE: [400, 'paymentMode must be one of: cash, upi, card, bank_transfer'],
  AMOUNT_EXCEEDS_DUE:   [400, 'Payment amount exceeds remaining due balance'],
};

function handleError(res: Response, error: any): void {
  const [status, message] = ERROR_MAP[error?.message] ?? [500, 'Internal server error'];
  res.status(status).json({ error: message });
}

export const feeController = {
  collectPayment: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, amount, paymentMode, referenceNo, remarks } = req.body;

      if (!studentId || amount === undefined || !paymentMode) {
        res.status(400).json({ error: 'studentId, amount and paymentMode are required' });
        return;
      }

      const result = await feeService.collectPayment(req.user!, { studentId, amount, paymentMode, referenceNo, remarks });
      res.status(201).json(result);
    } catch (error: any) {
      console.error('[Fees] collectPayment error:', error.message);
      handleError(res, error);
    }
  },

  getAllPayments: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Fees] GET /api/v1/fees/payments — role: ${req.user!.role}`);
      const payments = await feeService.getAllPayments(req.user!);
      res.json(payments);
    } catch (error: any) {
      console.error('[Fees] getAllPayments error:', error.message);
      handleError(res, error);
    }
  },

  getStudentLedger: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) { res.status(400).json({ error: 'Invalid student id' }); return; }

      const ledger = await feeService.getStudentLedger(studentId, req.user!);
      res.json(ledger);
    } catch (error: any) {
      console.error('[Fees] getStudentLedger error:', error.message);
      handleError(res, error);
    }
  },

  getBranchSummary: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const summary = await feeService.getBranchSummary(req.user!.branchId!);
      res.json(summary);
    } catch (error: any) {
      console.error('[Fees] getBranchSummary error:', error.message);
      handleError(res, error);
    }
  },

  getOverallSummary: async (_req: Request, res: Response): Promise<void> => {
    try {
      const summary = await feeService.getOverallSummary();
      res.json(summary);
    } catch (error: any) {
      console.error('[Fees] getOverallSummary error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
