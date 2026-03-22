import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe, NgTemplateOutlet, PercentPipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from './dashboard.service';
import {
  SuperAdminDashboard,
  BranchDashboard,
  isSuperAdminDashboard,
} from './dashboard.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { ChatbotAnalyticsComponent } from '../chatbot/chatbot-analytics.component';

type LoadState = 'loading' | 'error' | 'forbidden' | 'ready';

@Component({
  selector: 'snt-dashboard',
  standalone: true,
  imports: [
    StatCardComponent,
    PageStateComponent,
    PageShellComponent,
    ChatbotAnalyticsComponent,
    CurrencyPipe,
    PercentPipe,
    DecimalPipe,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Dashboard"
      [subtitle]="'Welcome back, ' + (user()?.name ?? '')"
    >
      @switch (state()) {
        @case ('loading') {
          <snt-page-state type="loading" title="Loading dashboard…" />
        }
        @case ('error') {
          <snt-page-state
            type="error"
            [description]="errorMessage() ?? undefined"
            actionLabel="Retry"
            (action)="load()"
          />
        }
        @case ('forbidden') {
          <snt-page-state
            type="forbidden"
            title="Branch Not Configured"
            description="Your account is not linked to a branch. Contact the Head Office administrator."
          />
        }
        @case ('ready') {
          @if (isSuperAdmin()) {
            <ng-container *ngTemplateOutlet="superAdminTpl" />
          } @else {
            <ng-container *ngTemplateOutlet="branchAdminTpl" />
          }
        }
      }
    </snt-page-shell>

    <!-- ── Super Admin KPI View ──────────────────────────────────────────── -->
    <ng-template #superAdminTpl>
      @if (superData(); as d) {
        <div class="stats-grid">
          <snt-stat-card label="Total Branches"      [value]="d.totalBranches"              icon="🏢" color="primary" />
          <snt-stat-card label="Active Branches"     [value]="d.activeBranches"             icon="✅" color="success" />
          <snt-stat-card label="Total Students"      [value]="d.totalStudents"              icon="🎓" color="info" />
          <snt-stat-card label="Total Revenue"       [value]="d.totalRevenue | currency:'INR':'symbol':'1.0-0'" icon="💰" color="success" />
          <snt-stat-card label="Total Enquiries"     [value]="d.totalEnquiries"             icon="📋" color="warning" />
          <snt-stat-card label="Conversion Rate"     [value]="(d.conversionRate / 100) | percent:'1.1-1'" icon="📈" color="success" />
          <snt-stat-card label="Total Placements"    [value]="d.totalPlacements"            icon="🚀" color="primary" />
          <snt-stat-card label="Certificates Issued" [value]="d.totalCertificates"          icon="🎖️" color="info" />
          <snt-stat-card label="Pending Discounts"   [value]="d.pendingDiscountRequests"    icon="🎟️" color="warning" />
          <snt-stat-card label="Pending Eligibility" [value]="d.pendingEligibilityRequests" icon="📝" color="warning" />
          <snt-stat-card label="Active Job Openings" [value]="d.activeJobOpenings"          icon="💼" color="info" />
          <snt-stat-card label="Total Courses"       [value]="d.totalCourses"               icon="📚" color="primary" />
        </div>

        @if (d.branches.length) {
          <div class="card mt-6">
            <p class="card-section-title">Branch Overview</p>
            <div class="table-wrapper" style="margin-top:16px">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Students</th>
                    <th>Enquiries</th>
                    <th>Revenue</th>
                    <th>Attendance</th>
                    <th>Placements</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of d.branches; track b.branchId) {
                    <tr>
                      <td class="font-medium">{{ b.branchName }}</td>
                      <td>{{ b.activeStudents }} / {{ b.totalStudents }}</td>
                      <td>{{ b.convertedEnquiries }} / {{ b.totalEnquiries }}</td>
                      <td>{{ b.totalRevenue | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td>{{ b.attendanceRate | number:'1.1-1' }}%</td>
                      <td>{{ b.placementsThisMonth }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <div class="mt-6">
          <snt-chatbot-analytics />
        </div>
      }
    </ng-template>

    <!-- ── Branch Admin KPI View ─────────────────────────────────────────── -->
    <ng-template #branchAdminTpl>
      @if (branchData(); as d) {
        <div class="stats-grid">
          <snt-stat-card label="Total Students"     [value]="d.totalStudents"                                       icon="🎓" color="primary" />
          <snt-stat-card label="Active Students"    [value]="d.activeStudents"                                      icon="✅" color="success" />
          <snt-stat-card label="Total Enquiries"    [value]="d.totalEnquiries"                                      icon="📋" color="info" />
          <snt-stat-card label="Conversion Rate"    [value]="(d.conversionRate / 100) | percent:'1.1-1'"            icon="📈" color="success" />
          <snt-stat-card label="Total Revenue"      [value]="d.totalRevenue | currency:'INR':'symbol':'1.0-0'"      icon="💰" color="success" />
          <snt-stat-card label="Pending Fees"       [value]="d.pendingFees | currency:'INR':'symbol':'1.0-0'"       icon="⏳" color="warning" />
          <snt-stat-card label="Active Batches"     [value]="d.activeBatches"                                       icon="👥" color="primary" />
          <snt-stat-card label="Attendance Rate"    [value]="(d.attendanceRate | number:'1.1-1') + '%'"             icon="📅" color="info" />
          <snt-stat-card label="Placements (Month)" [value]="d.placementsThisMonth"                                 icon="🚀" color="primary" />
          <snt-stat-card label="Certificates"       [value]="d.certificatesIssued"                                  icon="🎖️" color="info" />
          <snt-stat-card label="Recent Enquiries"   [value]="d.recentEnquiries"                                     icon="🆕" color="warning" />
          <snt-stat-card label="Pending Discounts"  [value]="d.pendingDiscountRequests"                             icon="🎟️" color="warning" />
        </div>
      }
    </ng-template>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly svc        = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user         = this.auth.currentUser;
  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly state        = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly superData    = signal<SuperAdminDashboard | null>(null);
  readonly branchData   = signal<BranchDashboard | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.svc
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (isSuperAdminDashboard(data)) {
            this.superData.set(data);
          } else {
            this.branchData.set(data);
          }
          this.state.set('ready');
        },
        error: (e: Error) => {
          if (e.message === 'NO_BRANCH') {
            this.state.set('forbidden');
          } else {
            this.errorMessage.set(e.message);
            this.state.set('error');
          }
        },
      });
  }
}
