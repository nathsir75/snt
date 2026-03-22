export type AlertType = 'followup_due' | 'discount_decision' | 'fee_due' | 'system';

export interface AlertBranch {
  id: number;
  name: string;
}

export interface AlertUser {
  id: number;
  name: string;
}

export interface Alert {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: number | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  branch: AlertBranch | null;
  user: AlertUser | null;
}

export interface AlertSummary {
  total: number;
  unread: number;
  byType: { type: AlertType; count: number }[];
}

export interface UnreadCountResult {
  count: number;
}

// Maps alert type → route for action navigation
export const ALERT_TYPE_CONFIG: Record<AlertType, { icon: string; label: string; color: string }> = {
  followup_due:      { icon: '📅', label: 'Follow-up Due',      color: '#f59e0b' },
  discount_decision: { icon: '💸', label: 'Discount Decision',  color: '#8b5cf6' },
  fee_due:           { icon: '💰', label: 'Fee Due',            color: '#ef4444' },
  system:            { icon: '🔔', label: 'System',             color: '#3b82f6' },
};

export function alertActionRoute(alert: Alert): string | null {
  if (!alert.entityType || !alert.entityId) return null;
  const routeMap: Record<string, string> = {
    enquiry:               `/enquiries/${alert.entityId}`,
    student:               `/students/${alert.entityId}`,
    certificate:           `/certificates/${alert.entityId}`,
    placement:             `/placements`,
    interview_application: `/applications`,
  };
  return routeMap[alert.entityType] ?? null;
}
