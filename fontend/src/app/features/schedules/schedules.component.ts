import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

@Component({
  selector: 'snt-schedules',
  standalone: true,
  imports: [PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Schedules"
      subtitle="View and manage batch session schedules and timings"
      icon="📅"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary">+ Add Schedule</button>
      </ng-container>
      <snt-page-state
        type="empty"
        title="No schedules defined"
        description="Create a schedule for a batch to define session days and timings."
        actionLabel="+ Add Schedule"
      />
    </snt-page-shell>
  `,
})
export class SchedulesComponent {}
