import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CareerService } from './career.service';
import {
  CareerApplication, CareerApplicationStatus,
  CAREER_STATUS_LABELS, CAREER_DEPARTMENT_LABELS, EXPERIENCE_RANGE_LABELS,
} from './career.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-career-applications',
  standalone: true,
  imports: [FormsModule, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Career Applications"
      subtitle="Manage job applications from candidates"
      icon="💼"
    >
      <ng-container slot="filters">
        <input class="filter-input" type="search" placeholder="Search by name, role, email…" [(ngModel)]="searchTerm" />
        <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">All Statuses</option>
          @for (s of statuses; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
        <select class="filter-select" [(ngModel)]="departmentFilter" (ngModelChange)="load()">
          <option value="">All Departments</option>
          @for (d of departments; track d.value) {
            <option [value]="d.value">{{ d.label }}</option>
          }
        </select>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state type="empty" title="No applications found" description="No career applications match your filters." />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role Applied</th>
                    <th>Department</th>
                    <th>Experience</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (app of filtered(); track app.id) {
                    <tr>
                      <td>
                        <div class="applicant-cell">
                          <p class="font-medium">{{ app.fullName }}</p>
                          <p class="text-muted">{{ app.phone }}</p>
                          <p class="text-muted">{{ app.email }}</p>
                        </div>
                      </td>
                      <td class="text-sm">{{ app.roleAppliedFor }}</td>
                      <td class="text-sm">{{ departmentLabel(app.department) }}</td>
                      <td class="text-sm">{{ experienceLabel(app.experienceRange) }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(app.status)" [variant]="statusVariant(app.status)" />
                      </td>
                      <td class="text-muted">{{ app.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" (click)="openDetail(app)">Review →</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="result-count">{{ filtered().length }} of {{ applications().length }} applications</p>
          }
        }
      }
    </snt-page-shell>

    <snt-drawer
      [open]="drawerOpen()"
      [title]="selected()?.fullName ?? 'Application Detail'"
      subtitle="Career Application"
      (closed)="drawerOpen.set(false)"
    >
      @if (selected(); as app) {
        <div class="detail-body">
          <div class="detail-section">
            <p class="detail-section-title">Candidate Details</p>
            <div class="detail-grid">
              <div class="detail-field"><span class="detail-label">Phone</span><span class="detail-value">{{ app.phone }}</span></div>
              <div class="detail-field"><span class="detail-label">Email</span><span class="detail-value">{{ app.email }}</span></div>
              <div class="detail-field"><span class="detail-label">City</span><span class="detail-value">{{ app.city }}</span></div>
              <div class="detail-field"><span class="detail-label">Experience</span><span class="detail-value">{{ experienceLabel(app.experienceRange) }}</span></div>
              <div class="detail-field"><span class="detail-label">Current Role</span><span class="detail-value">{{ app.currentRole ?? '—' }}</span></div>
              <div class="detail-field"><span class="detail-label">Current Company</span><span class="detail-value">{{ app.currentCompany ?? '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <p class="detail-section-title">Application Details</p>
            <div class="detail-grid">
              <div class="detail-field"><span class="detail-label">Role Applied</span><span class="detail-value">{{ app.roleAppliedFor }}</span></div>
              <div class="detail-field"><span class="detail-label">Department</span><span class="detail-value">{{ departmentLabel(app.department) }}</span></div>
              <div class="detail-field"><span class="detail-label">Skills</span><span class="detail-value">{{ app.skills }}</span></div>
              <div class="detail-field"><span class="detail-label">Expected CTC</span><span class="detail-value">{{ app.expectedCtc ?? '—' }}</span></div>
              <div class="detail-field"><span class="detail-label">Notice Period</span><span class="detail-value">{{ app.noticePeriod ?? '—' }}</span></div>
            </div>
            @if (app.resumeUrl) {
              <div class="detail-field">
                <span class="detail-label">Resume</span>
                <a [href]="app.resumeUrl" target="_blank" class="detail-link">View Resume ↗</a>
              </div>
            }
            @if (app.linkedinUrl) {
              <div class="detail-field">
                <span class="detail-label">LinkedIn</span>
                <a [href]="app.linkedinUrl" target="_blank" class="detail-link">View Profile ↗</a>
              </div>
            }
            @if (app.coverNote) {
              <div class="detail-message">
                <p class="detail-label">Cover Note</p>
                <p class="detail-value">{{ app.coverNote }}</p>
              </div>
            }
          </div>

          <div class="detail-section">
            <p class="detail-section-title">Update Status</p>
            <select class="form-input" [(ngModel)]="editStatus">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </div>

          <div class="detail-section">
            <p class="detail-section-title">Internal Notes</p>
            <textarea class="form-input form-textarea" [(ngModel)]="editNotes" placeholder="Add notes…" rows="3"></textarea>
          </div>

          @if (saveState() === 'saved') { <p class="save-success">✓ Updated successfully</p> }
          @if (saveState() === 'error') { <p class="save-error">Failed to update. Try again.</p> }

          <div class="drawer-actions">
            <button class="btn btn-primary" [disabled]="saveState() === 'saving'" (click)="saveDetail()">
              {{ saveState() === 'saving' ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      }
    </snt-drawer>
  `,
  styles: [`
    .filter-input { padding: 7px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); outline: none; min-width: 240px; }
    .filter-input:focus { border-color: var(--color-primary); }
    .filter-select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); outline: none; cursor: pointer; }
    .applicant-cell { display: flex; flex-direction: column; gap: 2px; }
    .font-medium { font-weight: 600; font-size: var(--font-size-sm); }
    .text-muted { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .text-sm { font-size: var(--font-size-sm); }
    .result-count { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
    .detail-body { display: flex; flex-direction: column; gap: 20px; }
    .detail-section { display: flex; flex-direction: column; gap: 10px; }
    .detail-section-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); border-bottom: 1px solid var(--color-border); padding-bottom: 6px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .detail-field { display: flex; flex-direction: column; gap: 3px; }
    .detail-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .detail-value { font-size: var(--font-size-sm); color: var(--color-text); }
    .detail-link { font-size: var(--font-size-sm); color: var(--color-primary); }
    .detail-message { display: flex; flex-direction: column; gap: 4px; }
    .form-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; width: 100%; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-textarea { resize: vertical; }
    .save-success { font-size: var(--font-size-sm); color: #059669; font-weight: 600; }
    .save-error   { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 600; }
    .drawer-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
  `],
})
export class CareerApplicationsComponent implements OnInit {
  private readonly svc        = inject(CareerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state        = signal<LoadState>('loading');
  readonly applications = signal<CareerApplication[]>([]);
  readonly drawerOpen   = signal(false);
  readonly selected     = signal<CareerApplication | null>(null);
  readonly saveState    = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  searchTerm       = '';
  statusFilter     = '';
  departmentFilter = '';
  editStatus: CareerApplicationStatus = 'new';
  editNotes = '';

  readonly statuses = Object.entries(CAREER_STATUS_LABELS).map(
    ([value, label]) => ({ value: value as CareerApplicationStatus, label })
  );

  readonly departments = Object.entries(CAREER_DEPARTMENT_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.applications().filter((app) =>
      !term ||
      app.fullName.toLowerCase().includes(term) ||
      app.email.toLowerCase().includes(term) ||
      app.roleAppliedFor.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    const params: Record<string, string> = {};
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.departmentFilter) params['department'] = this.departmentFilter;

    this.svc.list(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.applications.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  openDetail(app: CareerApplication): void {
    this.selected.set(app);
    this.editStatus = app.status;
    this.editNotes  = app.notes ?? '';
    this.saveState.set('idle');
    this.drawerOpen.set(true);
  }

  saveDetail(): void {
    const app = this.selected();
    if (!app) return;
    this.saveState.set('saving');
    this.svc.update(app.id, { status: this.editStatus, notes: this.editNotes })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.applications.update((list) => list.map((x) => x.id === updated.id ? updated : x));
          this.selected.set(updated);
          this.saveState.set('saved');
          setTimeout(() => this.saveState.set('idle'), 2500);
        },
        error: () => {
          this.saveState.set('error');
          setTimeout(() => this.saveState.set('idle'), 3000);
        },
      });
  }

  statusLabel(s: CareerApplicationStatus): string { return CAREER_STATUS_LABELS[s]; }
  departmentLabel(d: string): string { return CAREER_DEPARTMENT_LABELS[d as keyof typeof CAREER_DEPARTMENT_LABELS] ?? d; }
  experienceLabel(e: string): string { return EXPERIENCE_RANGE_LABELS[e as keyof typeof EXPERIENCE_RANGE_LABELS] ?? e; }

  statusVariant(s: CareerApplicationStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const map: Record<CareerApplicationStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      new: 'info', screening: 'warning', shortlisted: 'warning',
      interview_scheduled: 'warning', selected: 'success', rejected: 'danger', on_hold: 'neutral',
    };
    return map[s];
  }
}
