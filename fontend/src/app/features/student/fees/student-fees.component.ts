import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { StudentService, MyFees } from '../student.service';

@Component({
  selector: 'snt-student-fees',
  standalone: true,
  imports: [SlicePipe, CurrencyPipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div><h1>My Fees</h1><p>Your fee structure and payment history</p></div>
    </div>

    @if (loading()) {
      <div class="page-state">Loading fee details…</div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (data()) {

      <!-- Summary cards -->
      <div class="fee-summary">
        <div class="fee-card">
          <span class="fee-card__label">Total Fees</span>
          <span class="fee-card__value">{{ data()!.totalFees | currency:'INR':'symbol':'1.0-0' }}</span>
        </div>
        <div class="fee-card fee-card--paid">
          <span class="fee-card__label">Paid</span>
          <span class="fee-card__value">{{ data()!.totalPaid | currency:'INR':'symbol':'1.0-0' }}</span>
        </div>
        <div class="fee-card" [class.fee-card--due]="data()!.remainingDue > 0">
          <span class="fee-card__label">Remaining Due</span>
          <span class="fee-card__value">{{ data()!.remainingDue | currency:'INR':'symbol':'1.0-0' }}</span>
        </div>
        <div class="fee-card">
          <span class="fee-card__label">Progress</span>
          <div class="fee-progress">
            <div class="fee-progress__bar" [style.width.%]="paidPercent()"></div>
          </div>
          <span class="fee-card__sub">{{ paidPercent() }}% paid</span>
        </div>
      </div>

      <!-- Payment history -->
      @if (data()!.payments.length === 0) {
        <div class="card page-state">No payments recorded yet.</div>
      } @else {
        <div class="section-title">Payment History</div>
        <div class="card table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Reference</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              @for (p of data()!.payments; track p.id; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td>{{ p.paymentDate | slice:0:10 }}</td>
                  <td class="amount">{{ p.amount | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td><span class="badge badge-neutral">{{ p.paymentMode | uppercase }}</span></td>
                  <td class="text-muted text-sm">{{ p.referenceNo ?? '—' }}</td>
                  <td class="text-muted text-sm">{{ p.remarks ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    .page-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .page-state--error { color: var(--color-danger); }
    .fee-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .fee-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 16px;
      display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);
    }
    .fee-card--paid .fee-card__value { color: #16a34a; }
    .fee-card--due  .fee-card__value { color: #dc2626; }
    .fee-card__label { font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .4px; }
    .fee-card__value { font-size: var(--font-size-xl); font-weight: 700; }
    .fee-card__sub   { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .fee-progress { height: 6px; background: var(--color-border); border-radius: 999px; overflow: hidden; }
    .fee-progress__bar { height: 100%; background: var(--layout-accent, #16a34a); border-radius: 999px; transition: width .3s; }
    .section-title { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--color-text-muted); margin-bottom: 10px; }
    .table-wrapper { overflow-x: auto; }
    .amount { font-weight: 600; }
  `],
})
export class StudentFeesComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);

  readonly data    = signal<MyFees | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly paidPercent = () => {
    const d = this.data();
    if (!d || d.totalFees === 0) return 0;
    return Math.min(100, Math.round((d.totalPaid / d.totalFees) * 100));
  };

  ngOnInit(): void {
    this.studentSvc.getMyFees().subscribe({
      next:  (d) => { this.data.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e.error?.error ?? 'Failed to load fees'); this.loading.set(false); },
    });
  }
}
