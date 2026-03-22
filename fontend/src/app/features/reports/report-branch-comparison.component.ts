import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ReportService } from './report.service';
import { BranchWiseStat, OverallDashboard } from './report.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

type LoadState = 'loading' | 'error' | 'ready';

interface BranchRow extends BranchWiseStat {
  rank: number;
  conversionRate: number;
}

@Component({
  selector: 'snt-report-branch-comparison',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DecimalPipe, PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Branch Comparison"
      subtitle="Head Office cross-branch performance analytics"
      icon="🏆"
    >
      <ng-container slot="actions">
        <a routerLink="/reports" class="btn btn-secondary">← Reports Hub</a>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (overall(); as o) {

            <!-- Network KPI strip -->
            <div class="kpi-strip">
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalBranches }}</span>
                <span class="kpi-label">Total Branches</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalStudents }}</span>
                <span class="kpi-label">Network Students</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ o.totalEnquiries }}</span>
                <span class="kpi-label">Total Enquiries</span>
              </div>
              <div class="kpi-card kpi-green">
                <span class="kpi-value">{{ o.totalCollectedFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Total Collected</span>
              </div>
              <div class="kpi-card kpi-amber">
                <span class="kpi-value">{{ o.pendingFees | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="kpi-label">Pending Dues</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-value">{{ avgStudentsPerBranch() | number:'1.0-0' }}</span>
                <span class="kpi-label">Avg Students / Branch</span>
              </div>
            </div>

            <!-- Branch ranking table -->
            <div class="section-block">
              <div class="section-header">
                <p class="section-title">Branch Rankings</p>
                <input
                  class="search-input"
                  type="search"
                  placeholder="Filter branches…"
                  [(ngModel)]="searchTerm"
                />
              </div>
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th class="rank-col">#</th>
                      <th>Branch</th>
                      <th class="num-col">Students</th>
                      <th class="num-col">Collections</th>
                      <th class="num-col">Share of Students</th>
                      <th class="num-col">Share of Revenue</th>
                      <th class="bar-col">Revenue Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredRows(); track row.branchId) {
                      <tr [class.top-row]="row.rank === 1">
                        <td class="rank-col">
                          @if (row.rank === 1) { 🥇 }
                          @else if (row.rank === 2) { 🥈 }
                          @else if (row.rank === 3) { 🥉 }
                          @else { {{ row.rank }} }
                        </td>
                        <td class="font-medium">{{ row.branchName }}</td>
                        <td class="num-col">{{ row.students }}</td>
                        <td class="num-col">{{ row.collections | currency:'INR':'symbol':'1.0-0' }}</td>
                        <td class="num-col">
                          {{ o.totalStudents > 0 ? ((row.students / o.totalStudents) * 100 | number:'1.0-1') : '0' }}%
                        </td>
                        <td class="num-col">
                          {{ o.totalCollectedFees > 0 ? ((row.collections / o.totalCollectedFees) * 100 | number:'1.0-1') : '0' }}%
                        </td>
                        <td class="bar-col">
                          <div class="bar-track">
                            <div
                              class="bar-fill"
                              [style.width.%]="o.totalCollectedFees > 0 ? (row.collections / o.totalCollectedFees) * 100 : 0"
                            ></div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Student distribution visual -->
            @if (rankedRows().length) {
              <div class="section-block">
                <p class="section-title">Student Distribution</p>
                <div class="dist-chart">
                  @for (row of rankedRows(); track row.branchId) {
                    <div class="dist-row">
                      <span class="dist-label">{{ row.branchName }}</span>
                      <div class="dist-track">
                        <div
                          class="dist-bar"
                          [style.width.%]="o.totalStudents > 0 ? (row.students / o.totalStudents) * 100 : 0"
                          [title]="row.students + ' students'"
                        ></div>
                      </div>
                      <span class="dist-value">{{ row.students }}</span>
                    </div>
                  }
                </div>
              </div>
            }

          }
        }
      }
    </snt-page-shell>
  `,
  styles: [`
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .kpi-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); padding: 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .kpi-green { border-color: #6ee7b7; background: #f0fdf4; }
    .kpi-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); }
    .section-block { display: flex; flex-direction: column; gap: 12px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .section-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .search-input {
      padding: 6px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--font-size-sm);
      background: var(--color-surface); outline: none; min-width: 200px;
    }
    .search-input:focus { border-color: var(--color-primary); }
    .rank-col { width: 48px; text-align: center; }
    .num-col  { text-align: right; }
    .bar-col  { width: 140px; }
    .font-medium { font-weight: 600; }
    .top-row td { background: #fefce8; }
    .bar-track { height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; }
    .bar-fill  { height: 100%; background: var(--color-primary); border-radius: 4px; transition: width .4s ease; }
    .dist-chart { display: flex; flex-direction: column; gap: 10px; }
    .dist-row { display: grid; grid-template-columns: 160px 1fr 48px; align-items: center; gap: 12px; }
    .dist-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dist-track { height: 12px; background: var(--color-bg); border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border); }
    .dist-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 6px; transition: width .4s ease; min-width: 2px; }
    .dist-value { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); text-align: right; }
  `],
})
export class ReportBranchComparisonComponent implements OnInit {
  private readonly svc        = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state   = signal<LoadState>('loading');
  readonly overall = signal<OverallDashboard | null>(null);

  searchTerm = '';

  readonly rankedRows = computed<BranchRow[]>(() => {
    const o = this.overall();
    if (!o) return [];
    return [...o.branchWiseStats]
      .sort((a, b) => b.collections - a.collections)
      .map((row, i) => ({ ...row, rank: i + 1, conversionRate: 0 }));
  });

  readonly filteredRows = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.rankedRows().filter((r) =>
      !term || r.branchName.toLowerCase().includes(term)
    );
  });

  readonly avgStudentsPerBranch = computed(() => {
    const o = this.overall();
    if (!o || o.totalBranches === 0) return 0;
    return o.totalStudents / o.totalBranches;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.getOverallDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (d) => { this.overall.set(d); this.state.set('ready'); },
        error: () => this.state.set('error'),
      });
  }
}
