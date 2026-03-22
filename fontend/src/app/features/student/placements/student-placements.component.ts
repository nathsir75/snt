import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { StudentService, MyPlacement } from '../student.service';

@Component({
  selector: 'snt-student-placements',
  standalone: true,
  imports: [SlicePipe, CurrencyPipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Placements</h1><p>Your placement and job offer records</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading placements…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (placements().length === 0) {
      <div class="card page-state">
        <p>No placement records yet.</p>
        <p class="text-muted text-sm">Your placement details will appear here once recorded by the branch.</p>
      </div>
    } @else {
      <div class="placements-list">
        @for (p of placements(); track p.id) {
          <div class="placement-card card">
            <div class="placement-card__top">
              <div>
                <div class="placement-card__company">{{ p.company.name }}</div>
                @if (p.jobOpening) {
                  <div class="text-muted text-sm">{{ p.jobOpening.title }}</div>
                }
                @if (p.company.industry) {
                  <div class="text-muted text-sm">{{ p.company.industry }}</div>
                }
              </div>
              <span
                class="badge"
                [class.badge-success]="p.status === 'joined'"
                [class.badge-neutral]="p.status === 'offered'"
                [class.badge-danger]="p.status === 'rejected'"
              >{{ p.status | uppercase }}</span>
            </div>

            <div class="placement-card__meta">
              @if (p.salaryPackage) {
                <div class="placement-card__salary">
                  💰 {{ p.salaryPackage | currency:'INR':'symbol':'1.0-0' }} / year
                </div>
              }
              @if (p.joiningDate) {
                <div class="text-muted text-sm">Joining: {{ p.joiningDate | slice:0:10 }}</div>
              }
              @if (p.company.location) {
                <div class="text-muted text-sm">📍 {{ p.company.location }}</div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .placements-list { display: flex; flex-direction: column; gap: 12px; }
    .placement-card__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .placement-card__company { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 2px; }
    .placement-card__meta { display: flex; flex-direction: column; gap: 4px; }
    .placement-card__salary { font-size: var(--font-size-md); font-weight: 600; color: var(--layout-accent, #16a34a); }
  `],
})
export class StudentPlacementsComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly placements = signal<MyPlacement[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);

  ngOnInit(): void {
    this.studentSvc.getMyPlacements().subscribe({
      next:  (d) => { this.placements.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load placements'); this.loading.set(false); },
    });
  }
}
