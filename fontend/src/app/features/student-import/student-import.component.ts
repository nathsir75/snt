import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BatchService } from '../batches/batch.service';
import { Batch } from '../batches/batch.models';
import { ApiService } from '../../core/services/api.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type Issue = { row: number; message: string };
type Preview = { sourceRows: number; readyToCreate: number; existingAccounts: number; issues: Issue[]; sample: Array<{ row: number; name: string; email: string; mobile: string; status: string }> };
type Commit = { batchName: string; created: number; enrolledExisting: number; skippedExisting: number; issues: Issue[]; credentials: Array<{ name: string; email: string; temporaryPassword: string }> };

@Component({
  selector: 'snt-student-import',
  standalone: true,
  imports: [FormsModule, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="University student import" subtitle="Create student accounts and enrol them in a Head Office central programme" icon="📥">
      @if (loadingBatches()) { <snt-page-state type="loading" /> }
      @else {
        <section class="card">
          <h2>1. Select programme and Excel file</h2>
          <p class="muted">Only Head Office central programmes are available. The source file is not stored on the server.</p>
          <label>Central programme
            <select [(ngModel)]="batchId">
              <option [ngValue]="null">Select a programme</option>
              @for (batch of batches(); track batch.id) { <option [ngValue]="batch.id">{{ batch.name }} — {{ batch.course.name }}</option> }
            </select>
          </label>
          <label>University Excel file (.xlsx or .xls)
            <input type="file" accept=".xlsx,.xls" (change)="onFile($event)" />
          </label>
          @if (fileName()) { <p class="file">Selected: {{ fileName() }}</p> }
          <button class="btn btn-secondary" [disabled]="!canSubmit() || busy()" (click)="previewFile()">{{ busy() ? 'Checking…' : 'Preview import' }}</button>
          @if (error()) { <p class="error">{{ error() }}</p> }
        </section>

        @if (preview()) {
          <section class="card">
            <h2>2. Review before import</h2>
            <div class="metrics"><div><strong>{{ preview()!.sourceRows }}</strong><span>source rows</span></div><div><strong>{{ preview()!.readyToCreate }}</strong><span>new accounts</span></div><div><strong>{{ preview()!.existingAccounts }}</strong><span>existing accounts</span></div><div><strong>{{ preview()!.issues.length }}</strong><span>rows to review</span></div></div>
            @if (preview()!.issues.length) {
              <details open><summary>Rows to review</summary><ul>@for (issue of preview()!.issues.slice(0, 25); track issue.row + issue.message) { <li>Row {{ issue.row }}: {{ issue.message }}</li> }</ul></details>
            }
            <p class="muted">Import creates only valid new student accounts. Existing student accounts are enrolled in the programme if not already enrolled.</p>
            <button class="btn btn-primary" [disabled]="busy() || !preview()!.readyToCreate" (click)="commitImport()">{{ busy() ? 'Importing…' : 'Create accounts and enrol students' }}</button>
          </section>
        }

        @if (result()) {
          <section class="card success">
            <h2>Import complete</h2>
            <p>{{ result()!.created }} new accounts created; {{ result()!.enrolledExisting }} existing students enrolled.</p>
            <p class="warning">Download the credentials now. Temporary passwords are shown only in this browser response and are not saved in the LMS.</p>
            <button class="btn btn-primary" (click)="downloadCredentials()">Download credentials CSV</button>
          </section>
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .card{max-width:900px;background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:24px;margin:0 0 20px}.card h2{margin:0 0 8px}.muted{color:var(--muted,#64748b);margin:0 0 18px}.card label{display:block;font-weight:600;margin:16px 0}.card select,.card input[type=file]{display:block;width:100%;margin-top:7px;padding:10px;border:1px solid #cbd5e1;border-radius:7px;background:transparent}.file{font-size:.9rem}.error{color:#b91c1c;margin-top:12px}.metrics{display:flex;gap:14px;flex-wrap:wrap;margin:18px 0}.metrics div{min-width:120px;padding:13px;border-radius:8px;background:#f8fafc}.metrics strong{display:block;font-size:1.5rem}.metrics span{color:#64748b;font-size:.85rem}.warning{color:#92400e}.success{border-color:#86efac}details{margin:12px 0;padding:12px;background:#fff7ed;border-radius:8px}li{margin:5px 0}
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
  readonly result = signal<Commit | null>(null);
  batchId: number | null = null;
  private file: File | null = null;

  constructor() {
    this.batchService.getAll().subscribe({
      next: (batches) => { this.batches.set(batches.filter((batch) => batch.isCentralProgramme && batch.isActive)); this.loadingBatches.set(false); },
      error: () => { this.error.set('Could not load central programmes. Please retry.'); this.loadingBatches.set(false); },
    });
  }

  canSubmit(): boolean { return !!this.batchId && !!this.file; }
  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.fileName.set(this.file?.name ?? null); this.preview.set(null); this.result.set(null); this.error.set(null);
  }
  private form(): FormData {
    const form = new FormData(); form.append('batchId', String(this.batchId)); form.append('file', this.file!); return form;
  }
  previewFile(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true); this.error.set(null); this.result.set(null);
    this.api.postForm<Preview>('/students/import/preview', this.form()).subscribe({ next: (data) => { this.preview.set(data); this.busy.set(false); }, error: (e) => { this.error.set(e?.error?.error ?? 'Could not preview this file.'); this.busy.set(false); } });
  }
  commitImport(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true); this.error.set(null);
    this.api.postForm<Commit>('/students/import/commit', this.form()).subscribe({ next: (data) => { this.result.set(data); this.busy.set(false); }, error: (e) => { this.error.set(e?.error?.error ?? 'Import failed. No credentials were downloaded.'); this.busy.set(false); } });
  }
  downloadCredentials(): void {
    const rows = this.result()?.credentials ?? [];
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ['Name,Email,Temporary Password', ...rows.map((row) => [row.name, row.email, row.temporaryPassword].map(quote).join(','))].join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'snt-student-credentials.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
}
