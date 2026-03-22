import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ReportService } from './report.service';
import { FeeCollectionReport, DailyCollection } from './report.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-report-fees',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell title="Fee Collection Report" subtitle="Daily collections, totals and transaction history" icon="💰">
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-ghost">← Reports</a>
        <button class="btn btn-secondary" (click)="exportCsv()">⬇ Export CSV</button>
      </ng-container>

      <ng-container slot="filters">
        <div class="filter-bar">
          <label class="filter-label">From</label>
          <input class="filter-input" type="date" [(ngModel)]="fromDate" />
          <label class="filter-label">To</label>
          <input class="filter-input" type="date" [(ngModel)]="toDate" />
          <button class="btn btn-primary btn-sm" (click)="load()">Apply</button>
          @if (fromDate || toDate) {
            <button class="btn btn-ghost btn-sm" (click)="clearDates()">Clear</button>
          }
        </div>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (data(); as d) {
            <div class="kpi-strip">
              <div class="kpi-card kpi-card-green">
                <span class="kpi-value">{{ d.totalCollected | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Total Collected</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ d.totalTransactions }}</span>
                <span class="kpi-label">Transactions</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ d.dailyCollection.length }}</span>
                <span class="kpi-label">Active Days</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ avgDaily(d) | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Avg / Day</span>
              </div>
            </div>

            @if (!d.dailyCollection.length) {
              <snt-page-state type="empty" title="No transactions in this period" description="Try adjusting the date range." />
            } @else {
              <!-- Bar chart placeholder + table -->
              <div class="chart-placeholder">
                <p class="chart-placeholder-label">Daily Collection Trend</p>
                <div class="bar-chart">
                  @for (day of d.dailyCollection; track day.date) {
                    <div class="bar-col" [title]="day.date + ': ₹' + day.amount">
                      <div class="bar-fill" [style.height.%]="barHeight(day, d.dailyCollection)"></div>
                      <span class="bar-date">{{ day.date | date:'dd' }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (day of d.dailyCollection; track day.date) {
                      <tr>
                        <td>{{ day.date | date:'dd MMM yyyy' }}</td>
                        <td><span class="amount-cell">{{ day.amount | currency:'INR':'symbol':'1.0-0' }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .filter-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); white-space: nowrap; }
    .filter-input { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg); outline: none; }
    .filter-input:focus { border-color: var(--color-primary); }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-card-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .chart-placeholder { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; }
    .chart-placeholder-label { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-muted); margin-bottom: 12px; }
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; overflow-x: auto; padding-bottom: 20px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 24px; flex: 1; max-width: 40px; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; background: var(--color-primary); border-radius: 3px 3px 0 0; min-height: 4px; transition: height .2s; }
    .bar-date { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; }
    .amount-cell { font-weight: 700; color: #059669; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
  `],
})
export class ReportFeesComponent implements OnInit {
  private readonly svc        = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<LoadState>('loading');
  readonly data  = signal<FeeCollectionReport | null>(null);

  fromDate = '';
  toDate   = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.getFeeCollectionReport(this.fromDate || undefined, this.toDate || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.data.set(d); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }

  clearDates(): void { this.fromDate = ''; this.toDate = ''; this.load(); }

  avgDaily(d: FeeCollectionReport): number {
    return d.dailyCollection.length ? d.totalCollected / d.dailyCollection.length : 0;
  }

  barHeight(day: DailyCollection, all: DailyCollection[]): number {
    const max = Math.max(...all.map((d) => d.amount));
    return max > 0 ? Math.round((day.amount / max) * 100) : 0;
  }

  exportCsv(): void {
    const d = this.data();
    if (!d) return;
    const rows = [['Date', 'Amount'], ...d.dailyCollection.map((r) => [r.date, r.amount])];
    downloadCsv(rows, 'fee-collection-report.csv');
  }
}

function downloadCsv(rows: (string | number)[][], filename: string): void {
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
