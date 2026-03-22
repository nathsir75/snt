import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';

@Component({
  selector: 'snt-fee-structures',
  standalone: true,
  imports: [PageShellComponent, PageStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Fee Structures"
      subtitle="Define course pricing structures applied across branches"
      icon="🏷️"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary">+ Add Structure</button>
      </ng-container>
      <snt-page-state
        type="empty"
        title="No fee structures defined"
        description="Create a fee structure to apply pricing rules to courses for branches."
        actionLabel="+ Add Structure"
      />
    </snt-page-shell>
  `,
})
export class FeeStructuresComponent {}
