import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BatchService } from '../batches/batch.service';
import { Batch } from '../batches/batch.models';
import { ApiService } from '../../core/services/api.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type Issue = { row: number; message: string };
type PreviewRow = { row: number; name: string; email: string; mobile: string; status: string; message: string };
type Preview = {
  batch: { id: number; name: string; course: string; branch: string };
  sourceRows: number;
  readyToCreate: number;
  existingAccounts: number;
  blockedRows: number;
  actionableRows: number;
  issues: Issue[];
  sample: PreviewRow[];
};
type ImportResult = {
  batchName: string;
  created: number;
  linkedExistingStudents: number;
  enrolledExisting: number;
  alreadyEnrolled: number;
  skipped: number;
  issues: Issue[];
  credentials: Array<{ name: string; email: string; temporaryPassword: string }>;
};

@Component({
  selector: 'snt-student-import',
  standalone: true,
  imports: [FormsModule, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Student Import"
      subtitle="Create student logins, enrol them into a central programme, and download one-time credentials"
      icon="📥"
    >
      @if (loadingBatches()) {
        <snt-page-state type="loading" />
      } @else {
        <section class="import-grid">
          <article class="import-card">
            <div class="step-kicker">Step 1</div>
            <h2>Prepare the Excel file</h2>
            <p class="muted">Use the template columns exactly. The file is read in memory and is not stored on the server.</p>
            <button class="btn btn-secondary" type="button" (click)="downloadTemplate()">Download .xls template</button>
          </article>

          <article class="import-card">
            <div class="step-kicker">Step 2</div>
            <h2>Select programme and upload</h2>
            <label class="field">
              <span>Central programme batch</span>
              <select [(ngModel)]="batchId">
                <option [ngValue]="null">Select active central programme</option>
                @for (batch of centralBatches(); track batch.id) {
                  <option [ngValue]="batch.id">{{ batch.name }} - {{ batch.course.name }} ({{ batch.branch.name }})</option>
                }
              </select>
            </label>
            @if (!centralBatches().length) {
              <p class="warning">No active central programme batch is available. Mark the intended batch as Head Office central programme first.</p>
            }
            <label class="field">
              <span>Excel file (.xlsx or .xls)</span>
              <input type="file" accept=".xlsx,.xls" (change)="onFile($event)" />
            </label>
            @if (fileName()) {
              <p class="selected-file">{{ fileName() }}</p>
            }
            <div class="actions">
              <button class="btn btn-primary" type="button" [disabled]="!canSubmit() || busy()" (click)="previewFile()">
                {{ busy() ? 'Checking...' : 'Preview import' }}
              </button>
            </div>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
          </article>
        </section>

        @if (preview(); as p) {
          <section class="import-card">
            <div class="section-head">
              <div>
                <div class="step-kicker">Step 3</div>
                <h2>Review import</h2>
                <p class="muted">{{ p.batch.name }} - {{ p.batch.course }} - {{ p.batch.branch }}</p>
              </div>
              <button class="btn btn-primary" type="button" [disabled]="busy() || !p.actionableRows" (click)="commitImport()">
                {{ busy() ? 'Importing...' : 'Create accounts and enrol' }}
              </button>
            </div>
            <div class="metrics">
              <div><strong>{{ p.sourceRows }}</strong><span>Rows read</span></div>
              <div><strong>{{ p.readyToCreate }}</strong><span>New credentials</span></div>
              <div><strong>{{ p.existingAccounts }}</strong><span>Existing students</span></div>
              <div><strong>{{ p.blockedRows }}</strong><span>Blocked rows</span></div>
            </div>
            @if (p.sample.length) {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead><tr><th>Row</th><th>Student</th><th>Email</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (row of p.sample; track row.row) {
                      <tr>
                        <td>{{ row.row }}</td>
                        <td>{{ row.name }}</td>
                        <td>{{ row.email }}</td>
                        <td><span class="status-pill">{{ row.message }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            @if (p.issues.length) {
              <details class="issues" open>
                <summary>{{ p.issues.length }} row issue{{ p.issues.length === 1 ? '' : 's' }}</summary>
                <ul>
                  @for (issue of p.issues.slice(0, 50); track issue.row + issue.message) {
                    <li>Row {{ issue.row }}: {{ issue.message }}</li>
                  }
                </ul>
              </details>
            }
          </section>
        }

        @if (result(); as r) {
          <section class="import-card import-card--success">
            <div class="section-head">
              <div>
                <div class="step-kicker">Complete</div>
                <h2>Import complete</h2>
                <p class="muted">{{ r.batchName }}</p>
              </div>
              <button class="btn btn-primary" type="button" [disabled]="!r.credentials.length" (click)="downloadCredentials()">
                Download credential CSV
              </button>
            </div>
            <p class="warning">Download now. Temporary passwords are shown only in this browser response, are not saved in the LMS, and must be changed on first login.</p>
            <div class="metrics">
              <div><strong>{{ r.created }}</strong><span>New students</span></div>
              <div><strong>{{ r.linkedExistingStudents }}</strong><span>Linked existing</span></div>
              <div><strong>{{ r.enrolledExisting }}</strong><span>Existing enrolled</span></div>
              <div><strong>{{ r.alreadyEnrolled }}</strong><span>Already enrolled</span></div>
            </div>
            @if (r.issues.length) {
              <details class="issues">
                <summary>{{ r.issues.length }} skipped/issue row{{ r.issues.length === 1 ? '' : 's' }}</summary>
                <ul>
                  @for (issue of r.issues.slice(0, 50); track issue.row + issue.message) {
                    <li>Row {{ issue.row }}: {{ issue.message }}</li>
                  }
                </ul>
              </details>
            }
          </section>
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .import-grid { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 16px; }
    .import-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 16px; }
    .import-card h2 { margin: 0 0 6px; font-size: var(--font-size-xl); }
    .step-kicker { color: var(--color-primary); font-size: var(--font-size-xs); font-weight: 800; letter-spacing: .4px; text-transform: uppercase; margin-bottom: 6px; }
    .muted { color: var(--color-text-muted); font-size: var(--font-size-sm); line-height: 1.45; margin: 0 0 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin: 12px 0; font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: .4px; }
    .field select, .field input { padding: 9px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text); font-size: var(--font-size-sm); }
    .actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .selected-file { color: var(--color-text); font-size: var(--font-size-sm); margin: 6px 0 0; }
    .error { color: var(--color-danger); font-size: var(--font-size-sm); margin: 10px 0 0; }
    .warning { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: var(--radius-md); padding: 10px 12px; font-size: var(--font-size-sm); line-height: 1.4; }
    .section-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
    .metrics div { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; }
    .metrics strong { display: block; font-size: 24px; line-height: 1; margin-bottom: 5px; }
    .metrics span { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .status-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: var(--font-size-xs); font-weight: 700; }
    .issues { margin-top: 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px 12px; }
    .issues summary { cursor: pointer; font-weight: 800; font-size: var(--font-size-sm); }
    .issues li { margin: 6px 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .import-card--success { border-color: #86efac; }
    @media (max-width: 780px) {
      .import-grid, .metrics { grid-template-columns: 1fr; }
      .section-head { flex-direction: column; }
      .section-head .btn { width: 100%; }
    }
  `],
})
export class StudentImportComponent {
  private readonly batchService = inject(BatchService);
  private readonly api = inject(ApiService);

  readonly batches = signal<Batch[]>([]);
  readonly loadingBatches = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly preview = signal<Preview | null>(null);
  readonly result = signal<ImportResult | null>(null);

  batchId: number | null = null;
  private file: File | null = null;

  readonly centralBatches = () => this.batches().filter((batch) => batch.isActive && batch.isCentralProgramme);

  constructor() {
    this.batchService.getAll().subscribe({
      next: (batches) => { this.batches.set(batches); this.loadingBatches.set(false); },
      error: () => { this.error.set('Could not load central programme batches. Please retry.'); this.loadingBatches.set(false); },
    });
  }

  canSubmit(): boolean {
    return !!this.batchId && !!this.file;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.file = file;
    this.fileName.set(file?.name ?? null);
    this.preview.set(null);
    this.result.set(null);
    this.error.set(null);
    if (file && !/\.(xlsx|xls)$/i.test(file.name)) {
      this.error.set('Upload a .xlsx or .xls Excel file.');
      this.file = null;
    }
  }

  previewFile(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    this.api.postForm<Preview>('/students/import/preview', this.form()).subscribe({
      next: (data) => { this.preview.set(data); this.busy.set(false); },
      error: (error) => { this.error.set(error?.error?.error ?? 'Could not preview this file.'); this.busy.set(false); },
    });
  }

  commitImport(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.postForm<ImportResult>('/students/import/commit', this.form()).subscribe({
      next: (data) => { this.result.set(data); this.busy.set(false); },
      error: (error) => { this.error.set(error?.error?.error ?? 'Import failed. No credentials were downloaded.'); this.busy.set(false); },
    });
  }

  downloadTemplate(): void {
    const headers = [
      'Email Address',
      'Name of Student',
      'Mobile Number (Whatsaap Number)',
      'Education Qualification',
      'School/College/University Name',
    ];
    const sample = ['student@example.com', 'Student Name', '9876543210', 'HSC', 'College Name'];
    const row = (cells: string[]) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
    const html = `<table>${row(headers)}${row(sample)}</table>`;
    this.downloadBlob('snt-student-import-template.xls', html, 'application/vnd.ms-excel;charset=utf-8');
  }

  downloadCredentials(): void {
    const rows = this.result()?.credentials ?? [];
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      'Name,Email,Temporary Password,Password Policy',
      ...rows.map((row) => [row.name, row.email, row.temporaryPassword, 'Must change on first login'].map(quote).join(',')),
    ].join('\r\n');
    this.downloadBlob('snt-student-credentials.csv', csv, 'text/csv;charset=utf-8');
  }

  private form(): FormData {
    const form = new FormData();
    form.append('batchId', String(this.batchId));
    form.append('file', this.file!);
    return form;
  }

  private downloadBlob(filename: string, content: string, type: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
