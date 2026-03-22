import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherBatch } from '../teacher.service';

@Component({
  selector: 'snt-teacher-batches',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Batches</h1><p>Batches assigned to you</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading batches…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (batches().length === 0) {
      <div class="card page-state">No batches assigned yet.</div>
    } @else {
      <div class="batches-grid">
        @for (batch of batches(); track batch.id) {
          <div class="card batch-item">
            <div class="batch-item__top">
              <div>
                <div class="batch-item__name">{{ batch.name }}</div>
                <div class="text-muted text-sm">{{ batch.course.name }} ({{ batch.course.code }})</div>
              </div>
              <span class="badge" [class.badge-success]="batch.isActive" [class.badge-neutral]="!batch.isActive">
                {{ batch.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="batch-item__meta">
              <span>👥 {{ batch._count.batchStudents }} students</span>
              <span>📅 {{ batch.startDate | slice:0:10 }}</span>
              @if (batch.endDate) { <span>→ {{ batch.endDate | slice:0:10 }}</span> }
            </div>
            <div class="batch-item__actions">
              <a class="btn btn-secondary" [routerLink]="['/teacher/attendance']" [queryParams]="{ batchId: batch.id }">Attendance</a>
              <a class="btn btn-ghost"     [routerLink]="['/teacher/my-students']" [queryParams]="{ batchId: batch.id }">Students</a>
              <a class="btn btn-ghost"     [routerLink]="['/teacher/schedule']"    [queryParams]="{ batchId: batch.id }">Schedule</a>
              <a class="btn btn-ghost"     [routerLink]="['/teacher/content']">Content</a>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .batches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .batch-item__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .batch-item__name { font-weight: 600; font-size: var(--font-size-md); margin-bottom: 2px; }
    .batch-item__meta { display: flex; gap: 16px; font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: 16px; flex-wrap: wrap; }
    .batch-item__actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `],
})
export class TeacherBatchesComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);

  readonly batches = signal<TeacherBatch[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  ngOnInit(): void {
    this.teacherSvc.getMyBatches().subscribe({
      next:  (data) => { this.batches.set(data); this.loading.set(false); },
      error: (err)  => { this.error.set(err.message); this.loading.set(false); },
    });
  }
}
