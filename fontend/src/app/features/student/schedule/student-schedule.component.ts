import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { StudentService, MySchedule, MyScheduleSlot } from '../student.service';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'snt-student-schedule',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Schedule</h1><p>Your weekly class timetable</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading schedule…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (!data()?.batch) {
      <div class="card page-state">
        <p>You are not enrolled in any active batch yet.</p>
        <p class="text-muted text-sm">Contact your branch admin to get assigned.</p>
      </div>
    } @else if (data()!.schedules.length === 0) {
      <div class="card page-state">
        <p>No schedule set for <strong>{{ data()!.batch!.name }}</strong> yet.</p>
        <p class="text-muted text-sm">Check back later.</p>
      </div>
    } @else {

      <!-- Batch info pill -->
      <div class="batch-pill">
        <span class="batch-pill__name">{{ data()!.batch!.name }}</span>
        <span class="batch-pill__course text-muted text-sm">{{ data()!.batch!.course.name }}</span>
      </div>

      <!-- Weekly grid -->
      <div class="schedule-grid">
        @for (day of scheduledDays(); track day) {
          <div class="day-card card">
            <div class="day-card__name">{{ day }}</div>
            @for (slot of slotsForDay(day); track slot.id) {
              <div class="slot">
                <span class="slot__time">{{ slot.startTime }} – {{ slot.endTime }}</span>
                @if (slot.room) {
                  <span class="slot__room text-muted text-sm">Room {{ slot.room }}</span>
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
    .page-state--error { color: var(--color-danger); }
    .batch-pill {
      display: inline-flex; align-items: center; gap: 10px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 8px 16px; margin-bottom: 16px;
    }
    .batch-pill__name { font-weight: 600; font-size: var(--font-size-sm); }
    .schedule-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .day-card__name {
      font-weight: 700; font-size: var(--font-size-sm);
      color: var(--layout-accent, #16a34a);
      text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 10px;
    }
    .slot { padding: 8px 0; border-top: 1px solid var(--color-border); }
    .slot__time { font-weight: 600; font-size: var(--font-size-sm); display: block; }
    .slot__room { display: block; margin-top: 2px; }
  `],
})
export class StudentScheduleComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly data    = signal<MySchedule | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  scheduledDays(): string[] {
    const days = new Set(this.data()?.schedules.map((s) => s.dayName) ?? []);
    return DAY_ORDER.filter((d) => days.has(d));
  }

  slotsForDay(day: string): MyScheduleSlot[] {
    return this.data()?.schedules.filter((s) => s.dayName === day) ?? [];
  }

  ngOnInit(): void {
    this.studentSvc.getMySchedule().subscribe({
      next:  (d) => { this.data.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load schedule'); this.loading.set(false); },
    });
  }
}
