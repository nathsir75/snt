import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { DrawerComponent } from '../../shared/components/drawer/drawer.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: { name: string } | string;
  scope: 'global' | 'branch';
  isActive: boolean;
  status: 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
  branch: { id: number; name: string; city?: string } | null;
  trainerLink?: TrainerLink | null;
}

interface BranchOption {
  id: number;
  name: string;
  city: string;
}

interface UserForm {
  id?: number;
  name: string;
  email: string;
  role: string;
  scope: 'global' | 'branch';
  branchId: number | null;
  status: 'active' | 'suspended' | 'archived';
  password?: string;
}

interface TrainerLink {
  id: number;
  fullName: string;
  email: string | null;
  branch: { id: number; name: string; city?: string };
  batchCount: number;
}

interface TrainerLinkCandidate extends TrainerLink {
  isActive: boolean;
  linkedUser: { id: number; name: string; email: string; role: { name: string } } | null;
}

type LoadState = 'loading' | 'error' | 'ready';
type SecretNotice = { title: string; password: string; email: string; note?: string } | null;

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'branch_admin', label: 'Branch Admin' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

const GLOBAL_ALLOWED_ROLES = new Set(['super_admin', 'branch_admin', 'counselor', 'teacher']);

@Component({
  selector: 'snt-users',
  standalone: true,
  imports: [FormsModule, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent, DrawerComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Users"
      subtitle="Create and control staff, teacher and student login accounts"
      icon="👥"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="openCreate()">+ Create User</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <input class="filter-input" type="search" placeholder="Search name or email..." [(ngModel)]="searchTerm" (ngModelChange)="page.set(1)" />
          <select class="filter-select" [(ngModel)]="roleFilter" (ngModelChange)="page.set(1)">
            <option value="">All Roles</option>
            @for (role of roles; track role.value) {
              <option [value]="role.value">{{ role.label }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="branchFilter" (ngModelChange)="page.set(1)">
            <option [ngValue]="null">All Scopes</option>
            <option [ngValue]="0">Head Office / Global</option>
            @for (branch of branches(); track branch.id) {
              <option [ngValue]="branch.id">{{ branch.name }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </select>
          @if (searchTerm || roleFilter || branchFilter !== null || statusFilter) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
          }
          <span class="filter-count">{{ filtered().length }} user{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>
      </ng-container>

      @if (banner()) {
        <div class="notice" [class.notice--error]="bannerType() === 'error'">{{ banner() }}</div>
      }

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error') { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!filtered().length) {
            <snt-page-state type="empty" title="No users found" description="No users match your current filters." />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of paginated(); track u.id) {
                    <tr>
                      <td>
                        <div class="user-cell">
                          <span class="avatar">{{ initials(u.name) }}</span>
                          <span>
                            <strong>{{ u.name }}</strong>
                            <small>{{ u.email }}</small>
                          </span>
                        </div>
                      </td>
                      <td><snt-badge [label]="roleLabel(u.role)" [variant]="roleBadge(u.role)" /></td>
                      <td>
                        @if (isGlobalUser(u)) {
                          <snt-badge label="Head Office / Global" variant="primary" />
                        } @else {
                          <span class="text-muted">{{ u.branch?.name || 'Unassigned' }}</span>
                        }
                      </td>
                      <td><snt-badge [label]="statusLabel(u)" [variant]="statusBadge(u)" /></td>
                      <td class="text-muted">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn-secondary btn-sm" (click)="openEdit(u)">Edit</button>
                          <button class="btn btn-secondary btn-sm" (click)="resetPassword(u)">Reset</button>
                          <button class="btn btn-danger btn-sm" (click)="confirmDelete(u)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" [disabled]="page() === 1" (click)="page.set(page() - 1)">Prev</button>
                <span class="pagination-info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="btn btn-secondary btn-sm" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
              </div>
            }
          }
        }
      }
    </snt-page-shell>

    <snt-drawer [open]="drawerOpen()" [title]="form.id ? 'Edit User' : 'Create User'" [subtitle]="form.email || 'Issue a login account'" [wide]="true" (closed)="closeDrawer()">
      <div class="form-grid">
        <label class="form-field">
          <span>Name *</span>
          <input class="form-input" [(ngModel)]="form.name" />
        </label>
        <label class="form-field">
          <span>Email *</span>
          <input class="form-input" type="email" [(ngModel)]="form.email" />
          @if (form.id && form.role === 'teacher' && editingTrainerLink()) {
            <small class="field-help">Changing this login email will also update the linked Trainer email so portal access remains connected.</small>
          }
        </label>
        <label class="form-field">
          <span>Role *</span>
          <select class="form-input" [(ngModel)]="form.role" (ngModelChange)="onRoleChange()">
            @for (role of roles; track role.value) {
              <option [value]="role.value">{{ role.label }}</option>
            }
          </select>
        </label>
        <label class="form-field form-field--wide">
          <span>Access scope</span>
          <select class="form-input" [(ngModel)]="scopeSelection" (ngModelChange)="onScopeSelectionChange($event)">
            @if (canBeGlobal(form.role)) {
              <option value="global">Head Office / Global</option>
            }
            <option value="branch">Branch-specific</option>
          </select>
          <small class="field-help">{{ scopeHelpText() }}</small>
        </label>
        @if (form.scope === 'branch') {
          <label class="form-field">
            <span>Branch *</span>
            <select class="form-input" [(ngModel)]="form.branchId">
              <option [ngValue]="null">Select branch</option>
              @for (branch of branches(); track branch.id) {
                <option [ngValue]="branch.id">{{ branch.name }}@if (branch.city) { - {{ branch.city }} }</option>
              }
            </select>
          </label>
        } @else {
          <div class="scope-note">
            This account can work across franchise branches. Use only for approved Head Office staff or global teachers.
          </div>
        }
        @if (form.role === 'teacher') {
          <section class="teacher-link-panel form-field--wide">
            <div>
              <strong>Trainer access link</strong>
              @if (form.id && editingTrainerLink()) {
                <p>
                  Linked to Trainer {{ editingTrainerLink()!.fullName }}
                  in {{ editingTrainerLink()!.branch.name }} with {{ editingTrainerLink()!.batchCount }} batch assignment{{ editingTrainerLink()!.batchCount === 1 ? '' : 's' }}.
                </p>
              } @else {
                <p>Teacher portal access is linked by matching this login email to a Trainer email.</p>
              }
            </div>
            @if (!form.id) {
              <label class="form-field">
                <span>Create from trainer</span>
                <select class="form-input" [(ngModel)]="selectedTrainerId" (ngModelChange)="applyTrainerCandidate($event)">
                  <option [ngValue]="null">Select unlinked trainer</option>
                  @for (trainer of unlinkedTrainerCandidates(); track trainer.id) {
                    <option [ngValue]="trainer.id">
                      {{ trainer.fullName }} - {{ trainer.email }} ({{ trainer.branch.name }})
                    </option>
                  }
                </select>
                <small class="field-help">This fills the Teacher login with the Trainer email. Initial credentials are issued only after saving.</small>
              </label>
            } @else if (!editingTrainerLink()) {
              <div class="link-warning">
                No Trainer record currently matches this Teacher email. To link access, change the email to an existing Trainer email or create the Teacher User from an unlinked Trainer.
              </div>
            }
          </section>
        }
        @if (form.id) {
          <label class="form-field">
            <span>Status</span>
            <select class="form-input" [(ngModel)]="form.status">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        } @else {
          <label class="form-field password-field">
            <span>Initial Password</span>
            <input class="form-input" [(ngModel)]="form.password" placeholder="Leave blank to generate" />
            <small class="field-help">Leave blank to generate a secure temporary password.</small>
          </label>
        }
      </div>

      @if (formError()) {
        <div class="notice notice--error">{{ formError() }}</div>
      }

      <div class="drawer-actions">
        <button class="btn btn-secondary" (click)="closeDrawer()">Cancel</button>
        <button class="btn btn-primary" [disabled]="saving()" (click)="saveUser()">{{ saving() ? 'Saving...' : 'Save User' }}</button>
      </div>
    </snt-drawer>

    @if (secretNotice(); as notice) {
      <div class="secret-panel">
        <div>
          <strong>{{ notice.title }}</strong>
          <p>{{ notice.email }}</p>
          <code>{{ notice.password }}</code>
          @if (notice.note) {
            <small>{{ notice.note }}</small>
          }
        </div>
        <button class="btn btn-secondary btn-sm" (click)="copySecret(notice.password)">Copy</button>
        <button class="btn btn-ghost btn-sm" (click)="secretNotice.set(null)">Close</button>
      </div>
    }

    <snt-confirm-dialog
      [open]="!!deleteTarget()"
      title="Delete user?"
      message="Unlinked users are deleted. Users with LMS, trainer, batch, finance or audit records are archived instead."
      confirmLabel="Delete or Archive"
      (confirm)="deleteUser()"
      (cancel)="deleteTarget.set(null)"
    />
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .filter-input, .filter-select, .form-input { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); outline: none; }
    .filter-input { min-width: 220px; flex: 1; }
    .filter-input:focus, .filter-select:focus, .form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .filter-count { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; white-space: nowrap; }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-cell strong, .user-cell small { display: block; }
    .user-cell small { color: var(--color-text-muted); margin-top: 2px; }
    .avatar { width: 32px; height: 32px; border-radius: var(--radius-md); display: inline-flex; align-items: center; justify-content: center; background: var(--color-primary-light); color: var(--color-primary-dark); font-weight: 700; flex-shrink: 0; }
    .row-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
    .pagination-info { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .form-field--wide { grid-column: span 2; }
    .field-help { text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--color-text-muted); line-height: 1.35; }
    .scope-note { align-self: stretch; padding: 10px 12px; border: 1px solid #bfdbfe; border-radius: var(--radius-md); background: #eff6ff; color: #1e40af; font-size: var(--font-size-sm); line-height: 1.4; }
    .password-field { align-self: start; }
    .teacher-link-panel { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; background: var(--color-bg); display: grid; gap: 10px; }
    .teacher-link-panel strong { color: var(--color-text); font-size: var(--font-size-sm); text-transform: none; letter-spacing: 0; }
    .teacher-link-panel p { margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; text-transform: none; letter-spacing: 0; line-height: 1.4; }
    .link-warning { padding: 10px 12px; border: 1px solid #fed7aa; border-radius: var(--radius-md); background: #fff7ed; color: #9a3412; font-size: var(--font-size-sm); font-weight: 600; text-transform: none; letter-spacing: 0; line-height: 1.4; }
    .drawer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border); }
    .notice { padding: 10px 12px; border: 1px solid #bfdbfe; border-radius: var(--radius-md); background: #eff6ff; color: #1e40af; font-size: var(--font-size-sm); }
    .notice--error { border-color: #fecaca; background: #fef2f2; color: var(--color-danger); }
    .secret-panel { position: fixed; right: 24px; bottom: 24px; z-index: 250; width: min(460px, calc(100vw - 48px)); display: flex; align-items: center; gap: 10px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 14px; }
    .secret-panel p { color: var(--color-text-muted); font-size: var(--font-size-xs); margin: 2px 0 8px; }
    .secret-panel code { display: inline-block; padding: 4px 8px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
    .secret-panel small { display: block; margin-top: 8px; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    @media (max-width: 720px) { .form-field--wide { grid-column: auto; } .row-actions { flex-wrap: wrap; justify-content: flex-start; } .secret-panel { left: 12px; right: 12px; bottom: 12px; width: auto; flex-wrap: wrap; } }
  `],
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = ROLES;
  readonly state = signal<LoadState>('loading');
  readonly all = signal<UserRow[]>([]);
  readonly branches = signal<BranchOption[]>([]);
  readonly trainerCandidates = signal<TrainerLinkCandidate[]>([]);
  readonly page = signal(1);
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly banner = signal<string | null>(null);
  readonly bannerType = signal<'info' | 'error'>('info');
  readonly secretNotice = signal<SecretNotice>(null);
  readonly deleteTarget = signal<UserRow | null>(null);

  searchTerm = '';
  roleFilter = '';
  statusFilter = '';
  branchFilter: number | null = null;
  scopeSelection: 'global' | 'branch' = 'global';
  selectedTrainerId: number | null = null;
  form: UserForm = this.emptyForm();

  readonly filtered = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.all().filter((u) => {
      const matchSearch = !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const matchRole = !this.roleFilter || this.roleName(u.role) === this.roleFilter;
      const matchStatus = !this.statusFilter || u.status === this.statusFilter;
      const matchBranch = this.branchFilter === null ||
        (this.branchFilter === 0 ? this.isGlobalUser(u) : u.branch?.id === this.branchFilter);
      return matchSearch && matchRole && matchStatus && matchBranch;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 20)));
  readonly paginated = computed(() => this.filtered().slice((this.page() - 1) * 20, this.page() * 20));

  ngOnInit(): void {
    this.loadBranches();
    this.loadTrainerCandidates();
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.get<UserRow[]>('/users')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.all.set(data); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  loadBranches(): void {
    this.api.get<BranchOption[]>('/branches')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (branches) => this.branches.set(branches) });
  }

  loadTrainerCandidates(): void {
    this.api.get<TrainerLinkCandidate[]>('/users/trainer-link-candidates')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (trainers) => this.trainerCandidates.set(trainers) });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.scopeSelection = this.form.scope;
    this.selectedTrainerId = null;
    this.formError.set(null);
    this.drawerOpen.set(true);
  }

  openEdit(user: UserRow): void {
    this.form = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: this.roleName(user.role),
      scope: user.scope ?? (user.branch ? 'branch' : 'global'),
      branchId: user.branch?.id ?? null,
      status: user.status ?? (user.isActive ? 'active' : 'suspended'),
    };
    this.scopeSelection = this.form.scope;
    this.selectedTrainerId = null;
    this.formError.set(null);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.saving.set(false);
  }

  onRoleChange(): void {
    if (!this.canBeGlobal(this.form.role) && this.form.scope === 'global') {
      this.form.scope = 'branch';
    }
    if (this.form.role === 'super_admin') this.form.scope = 'global';
    if (this.form.scope === 'global') this.form.branchId = null;
    this.scopeSelection = this.form.scope;
  }

  onScopeSelectionChange(value: 'global' | 'branch'): void {
    this.form.scope = value;
    if (value === 'global') this.form.branchId = null;
  }

  saveUser(): void {
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.role) {
      this.formError.set('Name, email and role are required.');
      return;
    }
    if (this.form.scope === 'branch' && !this.form.branchId) {
      this.formError.set('Branch is required for this role.');
      return;
    }
    if (this.form.scope === 'global' && !this.canBeGlobal(this.form.role)) {
      this.formError.set('Global scope is only for approved Head Office staff roles and teachers.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    const payload = { ...this.form, email: this.form.email.trim().toLowerCase() };

    if (this.form.id) {
      this.api.patch<UserRow>(`/users/${this.form.id}`, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (user: UserRow) => {
            this.upsert(user);
            this.loadTrainerCandidates();
            this.bannerType.set('info');
            this.banner.set('User saved.');
            this.closeDrawer();
          },
          error: (error: { error?: { message?: string }; message?: string }) => {
            this.formError.set(error?.error?.message || error?.message || 'Failed to save user.');
            this.saving.set(false);
          },
        });
      return;
    }

    this.api.post<{ user: UserRow; initialPassword?: string }>('/users/create', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: { user: UserRow; initialPassword?: string }) => {
          this.upsert(result.user);
          this.loadTrainerCandidates();
          if (result.initialPassword) {
            this.secretNotice.set({
              title: 'Initial one-time credential issued',
              email: result.user.email,
              password: result.initialPassword,
              note: 'User must change this password on first login.',
            });
          }
          this.bannerType.set('info');
          this.banner.set('User saved.');
          this.closeDrawer();
        },
        error: (error: { error?: { message?: string }; message?: string }) => {
          this.formError.set(error?.error?.message || error?.message || 'Failed to save user.');
          this.saving.set(false);
        },
      });
  }

  resetPassword(user: UserRow): void {
    const password = window.prompt(`New password for ${user.email}. Leave blank to generate one-time password.`);
    if (password === null) return;

    this.api.post<{ user: UserRow; temporaryPassword: string }>(`/users/${user.id}/reset-password`, { password: password.trim() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.upsert(result.user);
          this.secretNotice.set({
            title: 'Temporary one-time credential issued',
            email: result.user.email,
            password: result.temporaryPassword,
            note: 'User must change this password on next login.',
          });
        },
        error: (error) => this.showError(error?.error?.message || 'Failed to reset password.'),
      });
  }

  confirmDelete(user: UserRow): void {
    this.deleteTarget.set(user);
  }

  deleteUser(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.api.delete<{ mode: 'deleted' | 'archived'; user?: UserRow }>(`/users/${target.id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.mode === 'deleted') {
            this.all.set(this.all().filter((u) => u.id !== target.id));
            this.banner.set('User deleted.');
          } else if (result.user) {
            this.upsert(result.user);
            this.banner.set('User has linked records and was archived.');
          }
          this.bannerType.set('info');
          this.deleteTarget.set(null);
        },
        error: (error) => {
          this.showError(error?.error?.message || 'Failed to delete user.');
          this.deleteTarget.set(null);
        },
      });
  }

  roleName(role: { name: string } | string): string {
    return typeof role === 'object' && role !== null ? role.name : (role ?? '');
  }

  roleLabel(role: { name: string } | string): string {
    return ROLES.find((item) => item.value === this.roleName(role))?.label ?? this.roleName(role);
  }

  roleBadge(role: { name: string } | string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      super_admin: 'danger',
      branch_admin: 'info',
      counselor: 'warning',
      teacher: 'success',
      student: 'neutral',
    };
    return map[this.roleName(role)] ?? 'neutral';
  }

  statusLabel(user: UserRow): string {
    if (user.status === 'archived') return 'Archived';
    if (user.status === 'suspended') return 'Suspended';
    return user.isActive ? 'Active' : 'Inactive';
  }

  statusBadge(user: UserRow): BadgeVariant {
    if (user.status === 'archived') return 'neutral';
    if (user.status === 'suspended') return 'danger';
    return user.isActive ? 'success' : 'warning';
  }

  canBeGlobal(role: string): boolean {
    return GLOBAL_ALLOWED_ROLES.has(role);
  }

  editingTrainerLink(): TrainerLink | null {
    if (!this.form.id) return null;
    return this.all().find((user) => user.id === this.form.id)?.trainerLink ?? null;
  }

  unlinkedTrainerCandidates(): TrainerLinkCandidate[] {
    return this.trainerCandidates().filter((trainer) => trainer.isActive && !trainer.linkedUser && !!trainer.email);
  }

  applyTrainerCandidate(trainerId: number | null): void {
    this.selectedTrainerId = trainerId;
    const trainer = this.trainerCandidates().find((item) => item.id === trainerId);
    if (!trainer || !trainer.email) return;

    this.form.role = 'teacher';
    this.form.name = trainer.fullName;
    this.form.email = trainer.email;
    this.form.scope = 'branch';
    this.form.branchId = trainer.branch.id;
    this.scopeSelection = this.form.scope;
  }

  scopeHelpText(): string {
    if (!this.canBeGlobal(this.form.role)) return 'Students are always tied to one franchise branch.';
    if (this.form.scope === 'global') return 'Global users are not tied to one branch and can work across the franchise network.';
    return 'Branch-specific users can work only within the selected franchise branch.';
  }

  isGlobalUser(user: UserRow): boolean {
    return user.scope === 'global';
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.branchFilter = null;
    this.page.set(1);
  }

  copySecret(password: string): void {
    navigator.clipboard?.writeText(password);
  }

  private emptyForm(): UserForm {
    return { name: '', email: '', role: 'branch_admin', scope: 'global', branchId: null, status: 'active', password: '' };
  }

  private upsert(user: UserRow): void {
    const rows = this.all();
    const index = rows.findIndex((item) => item.id === user.id);
    this.all.set(index >= 0 ? rows.map((item) => item.id === user.id ? user : item) : [user, ...rows]);
  }

  private showError(message: string): void {
    this.bannerType.set('error');
    this.banner.set(message);
  }
}
