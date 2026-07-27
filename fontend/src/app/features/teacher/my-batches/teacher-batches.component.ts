import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherBatch, BatchSchedule } from '../teacher.service';

@Component({
  selector: 'snt-teacher-batches',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Global Batches</h1><p>Online batches explicitly assigned to you across branches</p></div>
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
                <div class="text-muted text-sm">{{ batch.branch.name }} · {{ batch.branch.city }}</div>
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
            <div class="batch-item__schedule">{{ scheduleSummary(batch) }}</div>
            <div class="batch-item__actions">
              @if (batch.teamsJoinUrl) {
                <a class="btn btn-primary" [href]="batch.teamsJoinUrl" target="_blank" rel="noopener">Open Teams Class ↗</a>
              } @else {
                <button class="btn btn-secondary" disabled>Teams link not configured</button>
              }
              <a class="btn btn-ghost"     [routerLink]="['/teacher/my-students']" [queryParams]="{ batchId: batch.id }">Students</a>
              <a class="btn btn-ghost"     [routerLink]="['/teacher/schedule']"    [queryParams]="{ batchId: batch.id }">Schedule</a>
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
    .batch-item__schedule {
      padding: 10px 12px;
      margin-bottom: 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
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

  scheduleSummary(batch: TeacherBatch): string {
    if (!batch.batchSchedules.length) return 'No schedule set';
    return batch.batchSchedules.map((slot) => this.formatScheduleSlot(slot)).join('; ');
  }

  private formatScheduleSlot(slot: BatchSchedule): string {
    const start = this.formatTime(slot.startTime);
    const end = this.formatTime(slot.endTime);
    const compactStart = start.period === end.period ? start.time : `${start.time} ${start.period}`;
    return `${slot.dayName} ${compactStart}–${end.time} ${end.period}`;
  }

  private formatTime(value: string): { time: string; period: 'AM' | 'PM' } {
    const [hourRaw, minuteRaw = '00'] = value.split(':');
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return { time: `${hour12}:${String(minute).padStart(2, '0')}`, period };
  }
}
