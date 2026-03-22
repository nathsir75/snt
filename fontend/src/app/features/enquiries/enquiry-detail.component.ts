import {
  Component, inject, signal, OnInit,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { EnquiryService } from './enquiry.service';
import { Enquiry, FollowUp, ENQUIRY_STATUS_LABELS, ENQUIRY_STATUS_BADGE, FOLLOWUP_ACTION_LABELS } from './enquiry.models';
import { BadgeVariant } from '../../shared/components/badge/badge.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { FollowUpFormComponent } from './enquiry-followup-form.component';
import { ConvertStudentComponent } from './convert-student.component';
import { EnquiryFormComponent } from './enquiry-form.component';
import { AuthService } from '../../core/auth/auth.service';
import { Student } from '../students/student.models';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-enquiry-detail',
  standalone: true,
  imports: [
    DatePipe,
    PageStateComponent, BadgeComponent,
    FollowUpFormComponent, ConvertStudentComponent, EnquiryFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') { <snt-page-state type="loading" /> }
      @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
      @case ('ready') {
        @if (enquiry(); as e) {
          <div class="detail-layout">

            <!-- ── Left: Enquiry info ──────────────────────────────────── -->
            <div class="detail-main">

              <!-- Back + header -->
              <div class="detail-header">
                <button class="back-link" (click)="goBack()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Enquiries
                </button>
                <div class="detail-header__actions">
                  <button class="btn btn-secondary" (click)="editOpen.set(true)">Edit</button>
                  @if (e.status !== 'converted' && e.status !== 'lost') {
                    <button class="btn btn-primary" (click)="convertOpen.set(true)">🎓 Convert to Student</button>
                  }
                  @if (e.status === 'converted') {
                    <span class="badge badge-success">✓ Converted</span>
                  }
                </div>
              </div>

              <!-- Profile card -->
              <div class="card">
                <div class="profile-row">
                  <div class="profile-avatar">{{ e.fullName.charAt(0).toUpperCase() }}</div>
                  <div>
                    <h2 class="profile-name">{{ e.fullName }}</h2>
                    <p class="profile-sub">{{ e.mobile }}{{ e.email ? ' · ' + e.email : '' }}</p>
                  </div>
                  <snt-badge [label]="statusLabel(e.status)" [variant]="statusBadge(e.status)" />
                </div>

                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-item__key">Course Interest</span>
                    <span class="info-item__val">{{ e.courseInterest }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-item__key">Source</span>
                    <span class="info-item__val">{{ e.source ?? '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-item__key">City</span>
                    <span class="info-item__val">{{ e.city }}{{ e.state ? ', ' + e.state : '' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-item__key">Branch</span>
                    <span class="info-item__val">{{ e.branch.name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-item__key">Created</span>
                    <span class="info-item__val">{{ e.createdAt | date:'dd MMM yyyy' }}</span>
                  </div>
                  @if (e.remarks) {
                    <div class="info-item info-item--full">
                      <span class="info-item__key">Remarks</span>
                      <span class="info-item__val">{{ e.remarks }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- ── Right: Follow-up timeline ──────────────────────────── -->
            <div class="timeline-panel">
              <div class="timeline-panel__header">
                <h3 class="timeline-panel__title">Follow-up Timeline</h3>
                @if (e.status !== 'converted' && e.status !== 'lost') {
                  <button class="btn btn-secondary" (click)="followUpOpen.set(true)">+ Add</button>
                }
              </div>

              @if (followUpsLoading()) {
                <snt-page-state type="loading" [compact]="true" />
              } @else if (!followUps().length) {
                <snt-page-state type="empty" [compact]="true" title="No follow-ups yet" description="Add the first follow-up to start tracking." />
              } @else {
                <div class="timeline">
                  @for (fu of followUps(); track fu.id) {
                    <div class="timeline-item">
                      <div class="timeline-item__dot"></div>
                      <div class="timeline-item__content">
                        <div class="timeline-item__header">
                          <span class="timeline-item__action">{{ actionLabel(fu.actionType) }}</span>
                          @if (fu.statusAfterAction) {
                            <snt-badge [label]="statusLabel(fu.statusAfterAction)" [variant]="statusBadge(fu.statusAfterAction)" />
                          }
                        </div>
                        <p class="timeline-item__remarks">{{ fu.remarks }}</p>
                        <div class="timeline-item__meta">
                          <span>{{ fu.createdBy.name }}</span>
                          <span>{{ fu.createdAt | date:'dd MMM yyyy, h:mm a' }}</span>
                          @if (fu.nextFollowUpDate) {
                            <span class="timeline-item__next">Next: {{ fu.nextFollowUpDate | date:'dd MMM yyyy' }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>
        }
      }
    }

    <!-- Modals -->
    <snt-enquiry-form
      [open]="editOpen()"
      [enquiry]="enquiry()"
      (saved)="onEnquirySaved($event)"
      (cancel)="editOpen.set(false)"
    />

    <snt-followup-form
      [open]="followUpOpen()"
      [enquiryId]="enquiry()?.id ?? 0"
      (saved)="onFollowUpSaved($event)"
      (cancel)="followUpOpen.set(false)"
    />

    <snt-convert-student
      [open]="convertOpen()"
      [enquiry]="enquiry()"
      (converted)="onConverted($event)"
      (cancel)="convertOpen.set(false)"
    />
  `,
  styles: [`
    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .detail-layout { grid-template-columns: 1fr; }
    }
    .detail-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .detail-header__actions { display: flex; align-items: center; gap: 8px; }
    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: var(--font-size-sm); color: var(--color-text-muted);
      background: none; border: none; cursor: pointer; padding: 0;
    }
    .back-link:hover { color: var(--color-primary); }
    .profile-row {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 20px; flex-wrap: wrap;
    }
    .profile-avatar {
      width: 52px; height: 52px; border-radius: 50%;
      background: var(--color-primary-light); color: var(--color-primary-dark);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; flex-shrink: 0;
    }
    .profile-name { font-size: var(--font-size-lg); font-weight: 700; }
    .profile-sub  { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-item--full { grid-column: 1 / -1; }
    .info-item__key { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .info-item__val { font-size: var(--font-size-sm); color: var(--color-text); }
    .timeline-panel {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 20px;
    }
    .timeline-panel__header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .timeline-panel__title { font-size: var(--font-size-md); font-weight: 700; }
    .timeline { display: flex; flex-direction: column; }
    .timeline-item {
      display: flex; gap: 12px; padding-bottom: 20px; position: relative;
    }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item:not(:last-child)::before {
      content: ''; position: absolute; left: 7px; top: 16px; bottom: 0;
      width: 2px; background: var(--color-border);
    }
    .timeline-item__dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: var(--color-primary); border: 2px solid var(--color-primary-light);
      flex-shrink: 0; margin-top: 2px;
    }
    .timeline-item__content { flex: 1; min-width: 0; }
    .timeline-item__header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .timeline-item__action { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .timeline-item__remarks { font-size: var(--font-size-sm); color: var(--color-text); line-height: 1.5; margin-bottom: 6px; }
    .timeline-item__meta {
      display: flex; gap: 8px; flex-wrap: wrap;
      font-size: var(--font-size-xs); color: var(--color-text-muted);
    }
    .timeline-item__next { color: var(--color-warning); font-weight: 500; }
  `],
})
export class EnquiryDetailComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly svc        = inject(EnquiryService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state            = signal<LoadState>('loading');
  readonly errorMsg         = signal<string | null>(null);
  readonly enquiry          = signal<Enquiry | null>(null);
  readonly followUps        = signal<FollowUp[]>([]);
  readonly followUpsLoading = signal(false);

  readonly editOpen     = signal(false);
  readonly followUpOpen = signal(false);
  readonly convertOpen  = signal(false);

  private enquiryId = 0;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.enquiryId = Number(params.get('id'));
        this.load();
      });
  }

  load(): void {
    this.state.set('loading');
    this.svc.getById(this.enquiryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e) => { this.enquiry.set(e); this.state.set('ready'); this.loadFollowUps(); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  loadFollowUps(): void {
    this.followUpsLoading.set(true);
    this.svc.getFollowUpsByEnquiry(this.enquiryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fus) => { this.followUps.set(fus); this.followUpsLoading.set(false); },
        error: () => this.followUpsLoading.set(false),
      });
  }

  onEnquirySaved(updated: Enquiry): void {
    this.enquiry.set(updated);
    this.editOpen.set(false);
  }

  onFollowUpSaved(fu: FollowUp): void {
    this.followUps.update((list) => [...list, fu]);
    this.svc.getById(this.enquiryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => this.enquiry.set(e));
    this.followUpOpen.set(false);
  }

  onConverted(student: Student): void {
    this.convertOpen.set(false);
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'students', student.id]);
  }

  goBack(): void {
    const base = this.auth.isSuperAdmin() ? '/ho' : '/branch';
    this.router.navigate([base, 'enquiries']);
  }

  statusLabel(status: string): string {
    return ENQUIRY_STATUS_LABELS[status as keyof typeof ENQUIRY_STATUS_LABELS] ?? status;
  }

  statusBadge(status: string): BadgeVariant {
    return (ENQUIRY_STATUS_BADGE[status as keyof typeof ENQUIRY_STATUS_BADGE] ?? 'neutral') as BadgeVariant;
  }

  actionLabel(type: string): string {
    return FOLLOWUP_ACTION_LABELS[type as keyof typeof FOLLOWUP_ACTION_LABELS] ?? type;
  }
}
