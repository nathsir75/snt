import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'snt-branch-onboarding',
  standalone: true,
  imports: [RouterLink, PageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Branch Onboarding"
      subtitle="Step-by-step setup checklist for the new branch"
      icon="🚀"
    >
      <div class="coming-soon">
        <div class="coming-soon__icon">🚧</div>
        <h2 class="coming-soon__title">Onboarding Checklist Coming Soon</h2>
        <p class="coming-soon__desc">
          The branch onboarding workflow is being set up. Please use the branch profile
          to manage branch details in the meantime.
        </p>
        <a routerLink="/ho/branches" class="btn btn-secondary">← Back to Branches</a>
      </div>
    </snt-page-shell>
  `,
  styles: [`
    .coming-soon {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; text-align: center; gap: 16px;
    }
    .coming-soon__icon { font-size: 48px; }
    .coming-soon__title { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); }
    .coming-soon__desc {
      font-size: var(--font-size-sm); color: var(--color-text-muted);
      max-width: 440px; line-height: 1.65;
    }
  `],
})
export class BranchOnboardingComponent {}
