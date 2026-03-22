import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherBatch, BatchSchedule } from '../teacher.service';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'snt-teacher-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>Schedule</h1><p>Your weekly class timetable</p></div>
    </div>

    <!-- Batch tabs -->
    <div class="batch-tabs">
      @for (batch of batches(); track batch.id) {
        <button
          class="batch-tab"
          [class.batch-tab--active]="selectedBatchId() === batch.id"
          (click)="selectBatch(batch.id)"
        >{{ batch.name }}</button>
      }
    </div>

    @if (loading()) {
      <div class="page-state">Loading schedule…</div>
    } @else if (schedules().length === 0) {
      <div class="card page-state">No schedule set for this batch yet.</div>
    } @else {
      <div class="schedule-grid">
        @for (day of scheduledDays(); track day) {
          <div class="schedule-day card">
            <div class="schedule-day__name">{{ day }}</div>
            @for (slot of slotsForDay(day); track slot.id) {
              <div class="schedule-slot">
                <span class="schedule-slot__time">{{ slot.startTime }} – {{ slot.endTime }}</span>
                @if (slot.room) {
                  <span class="schedule-slot__room text-muted text-sm">Room: {{ slot.room }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .batch-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .batch-tab {
      padding: 6px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all .15s;
    }
    .batch-tab:hover { border-color: var(--layout-accent, #0d9488); }
    .batch-tab--active { background: var(--layout-accent, #0d9488); color: #fff; border-color: var(--layout-accent, #0d9488); }
    .schedule-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .schedule-day__name { font-weight: 700; font-size: var(--font-size-sm); color: var(--layout-accent, #0d9488); margin-bottom: 10px; text-transform: uppercase; letter-spacing: .5px; }
    .schedule-slot { padding: 8px 0; border-top: 1px solid var(--color-border); }
    .schedule-slot__time { font-weight: 600; font-size: var(--font-size-sm); display: block; }
    .schedule-slot__room { display: block; margin-top: 2px; }
  `],
})
export class TeacherScheduleComponent implements OnInit {
  private readonly teacherSvc = inject(TeacherService);
  private readonly route      = inject(ActivatedRoute);

  readonly batches         = signal<TeacherBatch[]>([]);
  readonly schedules       = signal<BatchSchedule[]>([]);
  readonly selectedBatchId = signal<number | null>(null);
  readonly loading         = signal(false);

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
    this.teacherSvc.getScheduleByBatch(batchId).subscribe({
      next:  (data) => { this.schedules.set(data); this.loading.set(false); },
      error: ()     => { this.schedules.set([]); this.loading.set(false); },
    });
  }

  scheduledDays(): string[] {
    const days = [...new Set(this.schedules().map((s) => s.dayName))];
    return DAY_NAMES.filter((d) => days.includes(d));
  }

  slotsForDay(day: string): BatchSchedule[] {
    return this.schedules().filter((s) => s.dayName === day);
  }
}
