import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherBatch, BatchStudent } from '../teacher.service';

@Component({
  selector: 'snt-teacher-students',
  standalone: true,
  imports: [SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Students</h1><p>Rosters from your assigned global training batches</p></div>
    </div>

    <!-- Batch selector -->
    <div class="batch-selector">
      @for (batch of batches(); track batch.id) {
        <button
          class="batch-tab"
          [class.batch-tab--active]="selectedBatchId() === batch.id"
          (click)="selectBatch(batch.id)"
        >
          {{ batch.name }}
          <small>{{ batch.branch.name }}</small>
          <span class="batch-tab__count">{{ batch._count.batchStudents }}</span>
        </button>
      }
    </div>

    @if (loading()) {
      <div class="page-state">Loading students…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (!selectedBatchId()) {
      <div class="page-state">Select a batch above to view students.</div>
    } @else if (students().length === 0) {
      <div class="page-state">No students in this batch yet.</div>
    } @else {
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Course</th>
              <th>Status</th>
              <th>Admission</th>
            </tr>
          </thead>
          <tbody>
            @for (s of students(); track s.id; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td>{{ s.student.fullName }}</td>
                <td>{{ s.student.branch.name }}</td>
                <td>{{ s.student.mobile }}</td>
                <td>{{ s.student.email || '—' }}</td>
                <td>{{ s.student.course }}</td>
                <td><span class="badge" [class.badge-success]="s.status === 'active'" [class.badge-neutral]="s.status !== 'active'">{{ s.status }}</span></td>
                <td>{{ s.student.admissionDate | slice:0:10 }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .batch-selector { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .batch-tab {
      padding: 6px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all .15s;
    }
    .batch-tab:hover { border-color: var(--layout-accent, #0d9488); }
    .batch-tab--active { background: var(--layout-accent, #0d9488); color: #fff; border-color: var(--layout-accent, #0d9488); }
    .batch-tab__count {
      background: rgba(255,255,255,.25);
      border-radius: 999px;
      padding: 1px 6px;
      font-size: var(--font-size-xs);
    }
    .batch-tab small { color: inherit; opacity: .75; font-size: var(--font-size-xs); }
  `],
})
export class TeacherStudentsComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly route      = inject(ActivatedRoute);

  readonly batches         = signal<TeacherBatch[]>([]);
  readonly students        = signal<BatchStudent[]>([]);
  readonly selectedBatchId = signal<number | null>(null);
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next: (data) => {
        this.batches.set(data);
        const qBatchId = this.route.snapshot.queryParamMap.get('batchId');
        const initial  = qBatchId ? parseInt(qBatchId) : data[0]?.id ?? null;
        if (initial) this.selectBatch(initial);
      },
    });
  }

  selectBatch(batchId: number): void {
    this.selectedBatchId.set(batchId);
    this.loading.set(true);
    this.error.set(null);
    this.teacherSvc.getStudentsByBatch(batchId).subscribe({
      next:  (data) => { this.students.set(data); this.loading.set(false); },
      error: (err)  => { this.error.set(err.message); this.loading.set(false); },
    });
  }
}
