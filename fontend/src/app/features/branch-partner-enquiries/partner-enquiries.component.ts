import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PartnerEnquiryService } from './partner-enquiry.service';
import {
  PartnerEnquiry, PartnerEnquiryStatus,
  PARTNER_ENQUIRY_STATUS_LABELS,
} from './partner-enquiry.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-partner-enquiries',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Franchise Partner Enquiries"
      subtitle="Manage incoming franchise partner applications"
      icon="🤝"
    >
      <ng-container slot="filters">
        <input class="filter-input" type="search" placeholder="Search by name, city, phone…" [(ngModel)]="searchTerm" />
        <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">All Statuses</option>
          @for (s of statuses; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state type="empty" title="No enquiries found" description="No partner enquiries match your filters." />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Location</th>
                    <th>Budget</th>
                    <th>Occupation</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of filtered(); track e.id) {
                    <tr>
                      <td>
                        <div class="applicant-cell">
                          <p class="font-medium">{{ e.fullName }}</p>
                          <p class="text-muted">{{ e.phone }}</p>
                          <p class="text-muted">{{ e.email }}</p>
                        </div>
                      </td>
                      <td>{{ e.city }}, {{ e.state }}</td>
                      <td class="text-sm">{{ e.investmentBudget }}</td>
                      <td class="text-sm">{{ e.currentOccupation }}</td>
                      <td>
                        <snt-badge [label]="statusLabel(e.status)" [variant]="statusVariant(e.status)" />
                      </td>
                      <td class="text-muted">{{ e.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" (click)="openDetail(e)">Review →</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="result-count">{{ filtered().length }} of {{ enquiries().length }} enquiries</p>
          }
        }
      }
    </snt-page-shell>

    <snt-drawer
      [open]="drawerOpen()"
      [title]="selected()?.fullName ?? 'Enquiry Detail'"
      subtitle="Franchise Partner Application"
      (closed)="drawerOpen.set(false)"
    >
      @if (selected(); as e) {
        <div class="detail-body">
          <div class="detail-section">
            <p class="detail-section-title">Applicant Details</p>
            <div class="detail-grid">
              <div class="detail-field"><span class="detail-label">Phone</span><span class="detail-value">{{ e.phone }}</span></div>
              <div class="detail-field"><span class="detail-label">Email</span><span class="detail-value">{{ e.email }}</span></div>
              <div class="detail-field"><span class="detail-label">Location</span><span class="detail-value">{{ e.city }}, {{ e.state }}</span></div>
              <div class="detail-field"><span class="detail-label">Occupation</span><span class="detail-value">{{ e.currentOccupation }}</span></div>
              <div class="detail-field"><span class="detail-label">Budget</span><span class="detail-value">{{ e.investmentBudget }}</span></div>
              <div class="detail-field"><span class="detail-label">Space</span><span class="detail-value">{{ e.spaceAvailable }}</span></div>
            </div>
            @if (e.message) {
              <div class="detail-message">
                <p class="detail-label">Message</p>
                <p class="detail-value">{{ e.message }}</p>
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
            <textarea class="form-input form-textarea" [(ngModel)]="editNotes" placeholder="Add notes about this enquiry…" rows="3"></textarea>
          </div>

          @if (saveState() === 'saved') { <p class="save-success">✓ Updated successfully</p> }
          @if (saveState() === 'error') { <p class="save-error">Failed to update. Try again.</p> }

          <div class="drawer-actions">
            @if (editStatus === 'approved') {
              <a [routerLink]="['/admin/branches/create']" [queryParams]="{enquiryId: e.id}" class="btn btn-primary">
                🏢 Create Branch from This →
              </a>
            }
            <button
              class="btn btn-primary"
              [disabled]="saveState() === 'saving'"
              (click)="saveDetail()"
            >
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
    .detail-message { display: flex; flex-direction: column; gap: 4px; }
    .form-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; width: 100%; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-textarea { resize: vertical; }
    .save-success { font-size: var(--font-size-sm); color: #059669; font-weight: 600; }
    .save-error   { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 600; }
    .drawer-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
  `],
})
export class PartnerEnquiriesComponent implements OnInit {
  private readonly svc        = inject(PartnerEnquiryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state      = signal<LoadState>('loading');
  readonly enquiries  = signal<PartnerEnquiry[]>([]);
  readonly drawerOpen = signal(false);
  readonly selected   = signal<PartnerEnquiry | null>(null);
  readonly saveState  = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  searchTerm   = '';
  statusFilter = '';
  editStatus: PartnerEnquiryStatus = 'new';
  editNotes = '';

  readonly statuses = Object.entries(PARTNER_ENQUIRY_STATUS_LABELS).map(
    ([value, label]) => ({ value: value as PartnerEnquiryStatus, label })
  );

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.enquiries().filter((e) =>
      !term ||
      e.fullName.toLowerCase().includes(term) ||
      e.city.toLowerCase().includes(term) ||
      e.phone.includes(term)
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list(this.statusFilter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.enquiries.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  openDetail(e: PartnerEnquiry): void {
    this.selected.set(e);
    this.editStatus = e.status;
    this.editNotes  = e.notes ?? '';
    this.saveState.set('idle');
    this.drawerOpen.set(true);
  }

  saveDetail(): void {
    const e = this.selected();
    if (!e) return;
    this.saveState.set('saving');
    this.svc.update(e.id, { status: this.editStatus, notes: this.editNotes })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.enquiries.update((list) => list.map((x) => x.id === updated.id ? updated : x));
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

  statusLabel(s: PartnerEnquiryStatus): string {
    return PARTNER_ENQUIRY_STATUS_LABELS[s];
  }

  statusVariant(s: PartnerEnquiryStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const map: Record<PartnerEnquiryStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      new: 'info', contacted: 'warning', site_visit: 'warning',
      approved: 'success', rejected: 'danger', on_hold: 'neutral',
    };
    return map[s];
  }
}
