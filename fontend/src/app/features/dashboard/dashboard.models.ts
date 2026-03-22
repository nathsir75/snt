export interface BranchMetrics {
  branchId: string;
  branchName: string;
  totalStudents: number;
  activeStudents: number;
  totalEnquiries: number;
  convertedEnquiries: number;
  totalRevenue: number;
  pendingFees: number;
  activeBatches: number;
  attendanceRate: number;
  placementsThisMonth: number;
  certificatesIssued: number;
}

export interface SuperAdminDashboard {
  totalBranches: number;
  activeBranches: number;
  totalStudents: number;
  totalRevenue: number;
  totalEnquiries: number;
  conversionRate: number;
  totalPlacements: number;
  totalCertificates: number;
  pendingDiscountRequests: number;
  pendingEligibilityRequests: number;
  activeJobOpenings: number;
  totalCourses: number;
  branches: BranchMetrics[];
}

export interface BranchDashboard {
  branchId: string;
  branchName: string;
  totalStudents: number;
  activeStudents: number;
  totalEnquiries: number;
  convertedEnquiries: number;
  conversionRate: number;
  totalRevenue: number;
  pendingFees: number;
  activeBatches: number;
  attendanceRate: number;
  placementsThisMonth: number;
  certificatesIssued: number;
  recentEnquiries: number;
  pendingDiscountRequests: number;
}

/** Union type returned by DashboardService.load() */
export type DashboardResult = SuperAdminDashboard | BranchDashboard;

/** Type guard — narrows DashboardResult to SuperAdminDashboard */
export function isSuperAdminDashboard(d: DashboardResult): d is SuperAdminDashboard {
  return 'totalBranches' in d;
}
