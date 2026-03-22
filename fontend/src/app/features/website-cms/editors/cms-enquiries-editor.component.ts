import {
  Component, inject, signal, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteCmsService } from '../website-cms.service';
import { SiteEnquiry, SITE_ENQUIRY_TYPES } from '../website-cms.models';

@Component({
  selector: 'snt-cms-enquiries-editor',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="enq-shell">

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="type-tabs">
          <button class="type-tab" [class.active]="activeType() === ''" (click)="switchType('')">All</button>
          @for (t of enquiryTypes; track t.type) {
            <button class="type-tab" [class.active]="activeType() === t.type" (click)="switchType(t.type)">
              {{ t.icon }} {{ t.label }}
            </button>
          }
        </div>
        <div class="status-filter">
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="loadEnquiries()">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-chip">Total: {{ enquiries().length }}</div>
        <div class="stat-chip stat-new">New: {{ newCount() }}</div>
      </div>

      <!-- List -->
      @if (loading()) {
        <div class="loading-state">Loading enquiries…</div>
      } @else if (!enquiries().length) {
        <div class="empty-state">No enquiries found for the selected filter.</div>
      } @else {
        <div class="enq-list">
          @for (enq of enquiries(); track enq.id) {
            <div class="enq-card" [class.enq-new]="enq.status === 'new'">
              <div class="enq-header">
                <div class="enq-type-badge">{{ typeLabel(enq.enquiryType) }}</div>
                <span class="enq-date">{{ enq.createdAt | slice:0:10 }}</span>
                <select class="status-select" [value]="enq.status" (change)="updateStatus(enq, $any($event.target).value)">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div class="enq-body">
                <p class="enq-name">{{ enq.fullName }}</p>
                <p class="enq-contact">📞 {{ enq.phone }}{{ enq.email ? ' · 📧 ' + enq.email : '' }}</p>
                @if (enq.subject) { <p class="enq-subject">{{ enq.subject }}</p> }
                @if (enq.message) { <p class="enq-message">{{ enq.message }}</p> }
                @if (enq.metaJson && hasKeys(enq.metaJson)) {
                  <div class="enq-meta">
                    @for (entry of metaEntries(enq.metaJson); track entry[0]) {
                      <span class="meta-chip">{{ entry[0] }}: {{ entry[1] }}</span>
                    }
                  </div>
                }
              </div>
              @if (enq.notes) {
                <div class="enq-notes">📝 {{ enq.notes }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .enq-shell { max-width: 960px; }
    .filter-bar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .type-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
    .type-tab { padding: 6px 12px; border-radius: 7px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; transition: all .12s; }
    .type-tab:hover { background: #f3f4f6; }
    .type-tab.active { background: #eef2ff; border-color: #6366f1; color: #6366f1; }
    .filter-select { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; outline: none; background: #fff; }
    .stats-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .stat-chip { padding: 4px 12px; background: #f3f4f6; border-radius: 20px; font-size: 12px; font-weight: 700; color: #374151; }
    .stat-new { background: #fef3c7; color: #d97706; }
    .loading-state, .empty-state { text-align: center; padding: 48px; color: #6b7280; }
    .enq-list { display: flex; flex-direction: column; gap: 10px; }
    .enq-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
    .enq-new { border-left: 3px solid #f59e0b; }
    .enq-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
    .enq-type-badge { background: #eef2ff; color: #6366f1; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; }
    .enq-date { font-size: 11px; color: #9ca3af; flex: 1; }
    .status-select { padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; outline: none; cursor: pointer; }
    .enq-body { display: flex; flex-direction: column; gap: 4px; }
    .enq-name { font-size: 15px; font-weight: 700; color: #111827; }
    .enq-contact { font-size: 13px; color: #6b7280; }
    .enq-subject { font-size: 13px; font-weight: 600; color: #374151; }
    .enq-message { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .enq-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .meta-chip { background: #f3f4f6; color: #374151; font-size: 11px; padding: 3px 8px; border-radius: 6px; }
    .enq-notes { margin-top: 8px; font-size: 12px; color: #6b7280; background: #f8fafc; padding: 8px 10px; border-radius: 6px; }
  `],
})
export class CmsEnquiriesEditorComponent implements OnInit {
  private readonly cms = inject(WebsiteCmsService);

  readonly enquiryTypes = SITE_ENQUIRY_TYPES;
  readonly activeType = signal('');
  readonly enquiries = signal<SiteEnquiry[]>([]);
  readonly loading = signal(false);
  statusFilter = '';

  readonly newCount = () => this.enquiries().filter(e => e.status === 'new').length;

  ngOnInit(): void { this.loadEnquiries(); }

  switchType(type: string): void {
    this.activeType.set(type);
    this.loadEnquiries();
  }

  loadEnquiries(): void {
    this.loading.set(true);
    this.cms.listEnquiries(this.activeType() || undefined, this.statusFilter || undefined).subscribe({
      next: (items) => { this.enquiries.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  updateStatus(enq: SiteEnquiry, status: string): void {
    this.cms.updateEnquiry(enq.id, { status }).subscribe({
      next: (updated) => this.enquiries.update(arr => arr.map(e => e.id === updated.id ? updated : e)),
    });
  }

  typeLabel(type: string): string {
    return this.enquiryTypes.find(t => t.type === type)?.label ?? type;
  }

  hasKeys(obj: Record<string, unknown>): boolean {
    return Object.keys(obj).length > 0;
  }

  metaEntries(obj: Record<string, unknown>): [string, string][] {
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]);
  }
}
