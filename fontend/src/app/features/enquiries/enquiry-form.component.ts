import {
  Component, inject, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, signal, OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { EnquiryService } from './enquiry.service';
import { Enquiry, EnquiryStatus } from './enquiry.models';
import { AuthService } from '../../core/auth/auth.service';
import { BranchService } from '../branches/branch.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

interface BranchOption { id: number; name: string; city: string; }

@Component({
  selector: 'snt-enquiry-form',
  standalone: true,
  imports: [ReactiveFormsModule, DrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-drawer
      [open]="open"
      [title]="enquiry ? 'Edit Enquiry' : 'New Enquiry'"
      [subtitle]="enquiry ? 'Update status or remarks' : 'Record a new student enquiry'"
      (closed)="cancel.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">

        @if (serverError()) {
          <div class="form-error-banner">{{ serverError() }}</div>
        }

        @if (!enquiry) {
          <!-- ── Create mode — full form ──────────────────────────────── -->
          <div class="form-group">
            <label for="fullName">Full Name *</label>
            <input id="fullName" formControlName="fullName" placeholder="e.g. Rahul Sharma" />
            @if (f['fullName'].invalid && f['fullName'].touched) {
              <span class="field-error">Full name is required</span>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="mobile">Mobile *</label>
              <input id="mobile" formControlName="mobile" placeholder="10-digit number" />
              @if (f['mobile'].invalid && f['mobile'].touched) {
                <span class="field-error">Valid 10-digit mobile required</span>
              }
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" placeholder="optional" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="city">City *</label>
              <input id="city" formControlName="city" placeholder="e.g. Pune" />
              @if (f['city'].invalid && f['city'].touched) {
                <span class="field-error">City is required</span>
              }
            </div>
            <div class="form-group">
              <label for="state">State</label>
              <input id="state" formControlName="state" placeholder="e.g. Maharashtra" />
            </div>
          </div>

          <div class="form-group">
            <label for="courseInterest">Course Interest *</label>
            <input id="courseInterest" formControlName="courseInterest" placeholder="e.g. Full Stack Development" />
            @if (f['courseInterest'].invalid && f['courseInterest'].touched) {
              <span class="field-error">Course interest is required</span>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="source">Source</label>
              <select id="source" formControlName="source">
                <option value="">Select source</option>
                <option value="walk_in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="website">Website</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- ── Branch field — role-aware ──────────────────────────── -->
            <div class="form-group">
              @if (isSuperAdmin()) {
                <!-- super_admin: dropdown to pick any active branch -->
                <label for="branchId">Assign to Branch *</label>
                @if (branchesLoading()) {
                  <select id="branchId" formControlName="branchId" [attr.disabled]="true">
                    <option value="">Loading branches…</option>
                  </select>
                } @else {
                  <select id="branchId" formControlName="branchId">
                    <option value="">Select branch</option>
                    @for (b of branches(); track b.id) {
                      <option [value]="b.id">{{ b.name }} — {{ b.city }}</option>
                    }
                  </select>
                }
                @if (f['branchId'].invalid && f['branchId'].touched) {
                  <span class="field-error">Branch is required</span>
                }
              } @else {
                <!-- branch_admin: read-only label, branchId comes from token -->
                <label>Assigned Branch</label>
                <div class="branch-readonly">
                  <span class="branch-readonly__icon">🏢</span>
                  <span class="branch-readonly__name">{{ myBranchName() || 'Your Branch' }}</span>
                  <span class="branch-readonly__badge">Auto-assigned</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- ── Edit mode — status + remarks only ──────────────────── -->
          <div class="form-group">
            <label for="status">Status *</label>
            <select id="status" formControlName="status">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow Up</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        }

        <div class="form-group">
          <label for="remarks">Remarks</label>
          <textarea id="remarks" formControlName="remarks" rows="3" placeholder="Any additional notes…"></textarea>
        </div>

        <div class="drawer-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="loading()">
            {{ loading() ? 'Saving…' : (enquiry ? 'Update' : 'Create Enquiry') }}
          </button>
        </div>

      </form>
    </snt-drawer>
  `,
  styles: [`
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error-banner {
      background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: var(--radius-md); padding: 10px 14px;
      font-size: var(--font-size-sm); margin-bottom: 16px;
    }
    .drawer-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; margin-top: 8px;
      border-top: 1px solid var(--color-border);
    }
    textarea { resize: vertical; min-height: 80px; }
    .branch-readonly {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; background: var(--color-bg);
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }
    .branch-readonly__icon { font-size: 16px; }
    .branch-readonly__name { font-weight: 600; color: var(--color-text); flex: 1; }
    .branch-readonly__badge {
      font-size: var(--font-size-xs); background: #d1fae5; color: #065f46;
      padding: 2px 8px; border-radius: 10px; font-weight: 600;
    }
  `],
})
export class EnquiryFormComponent implements OnChanges, OnInit {
  @Input() open = false;
  @Input() enquiry: Enquiry | null = null;

  @Output() saved  = new EventEmitter<Enquiry>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(EnquiryService);
  private readonly auth       = inject(AuthService);
  private readonly branchSvc  = inject(BranchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading      = signal(false);
  readonly serverError  = signal<string | null>(null);
  readonly branches     = signal<BranchOption[]>([]);
  readonly branchesLoading = signal(false);
  readonly myBranchName = signal<string>('');

  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly form = this.fb.nonNullable.group({
    fullName:       ['', Validators.required],
    mobile:         ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email:          [''],
    city:           ['', Validators.required],
    state:          [''],
    courseInterest: ['', Validators.required],
    source:         [''],
    branchId:       [0 as number | string, Validators.required],
    status:         ['new' as EnquiryStatus],
    remarks:        [''],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    if (this.auth.isSuperAdmin()) {
      this.loadBranches();
    } else {
      // branch_admin / counselor — branchId comes from token; load name via /branches/me
      const bid = this.auth.branchId();
      if (bid) this.form.patchValue({ branchId: bid });
      this.branchSvc.getMyBranch()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (b) => this.myBranchName.set(b.name), error: () => {} });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiry'] && this.enquiry) {
      this.form.patchValue({
        status:  this.enquiry.status,
        remarks: this.enquiry.remarks ?? '',
      });
    }
    if (changes['open'] && this.open && !this.enquiry) {
      this.form.reset({
        branchId: this.auth.isSuperAdmin() ? '' : (this.auth.branchId() ?? 0),
        status: 'new',
      });
      this.serverError.set(null);
    }
  }

  private loadBranches(): void {
    this.branchesLoading.set(true);
    this.branchSvc.listForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.branches.set(list); this.branchesLoading.set(false); },
        error: () => this.branchesLoading.set(false),
      });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();

    const call$ = this.enquiry
      ? this.svc.updateStatus(this.enquiry.id, { status: v.status as EnquiryStatus, remarks: v.remarks || undefined })
      : this.svc.create({
          fullName:       v.fullName,
          mobile:         v.mobile,
          email:          v.email || undefined,
          city:           v.city,
          state:          v.state || undefined,
          courseInterest: v.courseInterest,
          source:         v.source || undefined,
          // Only send branchId for super_admin — backend ignores it for branch_admin
          ...(this.auth.isSuperAdmin() ? { branchId: Number(v.branchId) } : {}),
          remarks:        v.remarks || undefined,
        });

    call$.subscribe({
      next:  (result) => { this.loading.set(false); this.saved.emit(result); },
      error: (e: Error) => { this.serverError.set(e.message); this.loading.set(false); },
    });
  }
}
