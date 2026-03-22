import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { StudentService, StudentProfile } from '../student.service';

@Component({
  selector: 'snt-student-profile',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Profile</h1><p>Your personal and academic information</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading profile…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (notLinked()) {
      <div class="card page-state">
        <p>Your student profile is not linked yet.</p>
        <p class="text-muted text-sm">Contact your branch office to complete your account setup.</p>
      </div>
    } @else if (profile()) {

      <div class="profile-grid">

        <!-- Read-only info card -->
        <div class="card info-card">
          <div class="info-card__avatar">{{ initials() }}</div>
          <div class="info-card__name">{{ profile()!.fullName }}</div>
          <div class="info-card__branch text-muted text-sm">{{ profile()!.branch.name }}, {{ profile()!.branch.city }}</div>

          <div class="info-rows">
            <div class="info-row"><span class="info-row__label">Email</span><span>{{ profile()!.email ?? '—' }}</span></div>
            <div class="info-row"><span class="info-row__label">Course</span><span>{{ profile()!.course }}</span></div>
            <div class="info-row"><span class="info-row__label">Admission</span><span>{{ profile()!.admissionDate | slice:0:10 }}</span></div>
            @if (profile()!.activeBatch) {
              <div class="info-row"><span class="info-row__label">Batch</span><span>{{ profile()!.activeBatch!.batchName }}</span></div>
              <div class="info-row"><span class="info-row__label">Joined</span><span>{{ profile()!.activeBatch!.joinedAt | slice:0:10 }}</span></div>
            }
          </div>
        </div>

        <!-- Editable fields card -->
        <div class="card edit-card">
          <div class="edit-card__title">Update Contact Info</div>
          <p class="text-muted text-sm" style="margin-bottom:16px">You can update your mobile number and city.</p>

          <div class="form-field">
            <label class="form-label">Mobile</label>
            <input
              class="form-input"
              type="tel"
              maxlength="10"
              [(ngModel)]="editMobile"
              placeholder="10-digit mobile"
            />
          </div>

          <div class="form-field">
            <label class="form-label">City</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="editCity"
              placeholder="Your city"
            />
          </div>

          @if (saveError()) {
            <div class="form-error">{{ saveError() }}</div>
          }
          @if (saveSuccess()) {
            <div class="form-success">Profile updated successfully.</div>
          }

          <button
            class="btn btn-primary"
            [disabled]="saving()"
            (click)="save()"
          >
            {{ saving() ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .info-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 28px 20px; text-align: center; }
    .info-card__avatar {
      width: 60px; height: 60px; border-radius: 50%;
      background: var(--layout-accent, #16a34a); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; margin-bottom: 8px;
    }
    .info-card__name { font-size: var(--font-size-lg); font-weight: 700; }
    .info-rows { width: 100%; margin-top: 16px; display: flex; flex-direction: column; gap: 0; }
    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
    }
    .info-row:last-child { border-bottom: none; }
    .info-row__label { color: var(--color-text-muted); font-weight: 500; }
    .edit-card { padding: 24px; }
    .edit-card__title { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 4px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .form-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .form-input {
      padding: 8px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-bg); outline: none;
    }
    .form-input:focus { border-color: var(--layout-accent, #16a34a); }
    .form-error   { color: var(--color-danger); font-size: var(--font-size-sm); margin-bottom: 10px; }
    .form-success { color: #16a34a; font-size: var(--font-size-sm); margin-bottom: 10px; }
  `],
})
export class StudentProfileComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly profile     = signal<StudentProfile | null>(null);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);
  readonly notLinked   = signal(false);
  readonly saving      = signal(false);
  readonly saveError   = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  editMobile = '';
  editCity   = '';

  readonly initials = () => {
    const name = this.profile()?.fullName ?? '';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  };

  ngOnInit(): void {
    this.studentSvc.getMyProfile().subscribe({
      next: (res) => {
        if (!res.linked) { this.notLinked.set(true); this.loading.set(false); return; }
        this.profile.set(res);
        this.editMobile = res.mobile;
        this.editCity   = res.city;
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load profile'); this.loading.set(false); },
    });
  }

  save(): void {
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.saving.set(true);
    this.studentSvc.updateMyProfile({ mobile: this.editMobile, city: this.editCity }).subscribe({
      next: (updated) => {
        this.profile.update((p) => p ? { ...p, mobile: updated.mobile, city: updated.city } : p);
        this.saveSuccess.set(true);
        this.saving.set(false);
      },
      error: (e) => {
        this.saveError.set(e.error?.error ?? 'Failed to save');
        this.saving.set(false);
      },
    });
  }
}
