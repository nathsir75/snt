import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

@Component({
  selector: 'snt-trainers',
  standalone: true,
  imports: [PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Trainers"
      subtitle="Manage trainers, their specializations, and batch assignments"
      icon="👨‍🏫"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary">+ Add Trainer</button>
      </ng-container>
      <snt-page-state
        type="empty"
        title="No trainers added"
        description="Add a trainer to assign them to batches and schedules."
        actionLabel="+ Add Trainer"
      />
    </snt-page-shell>
  `,
})
export class TrainersComponent {}
