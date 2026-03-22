import {
  Component, inject, signal,
  OnInit, ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PageService } from './page.service';
import { Page } from './page.models';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageStateComponent } from '../../shared/components/page-state/page-state.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { PageFormComponent } from './page-form.component';

type LoadState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'snt-page-builder',
  standalone: true,
  imports: [RouterLink, DatePipe, PageShellComponent, PageStateComponent, BadgeComponent, PageFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <snt-page-shell
      title="Page Builder"
      subtitle="Design and publish public-facing website pages for your branches"
      icon="🏗️"
    >
      <ng-container slot="actions">
        <button class="btn btn-primary" (click)="formOpen.set(true)">+ New Page</button>
      </ng-container>

      @switch (state()) {
        @case ('loading') { <snt-page-state type="loading" /> }
        @case ('error')   { <snt-page-state type="error" [description]="errorMsg() ?? undefined" actionLabel="Retry" (action)="load()" /> }
        @case ('ready') {
          @if (!pages().length) {
            <snt-page-state
              type="empty"
              title="No pages created"
              description="Build your first page using the visual section editor."
              actionLabel="+ New Page"
              (action)="formOpen.set(true)"
            />
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Type</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pages(); track p.id) {
                    <tr>
                      <td class="font-medium">{{ p.title }}</td>
                      <td><span class="slug-pill">/{{ p.slug }}</span></td>
                      <td class="text-muted">{{ p.pageType }}</td>
                      <td class="text-muted">{{ p.branch.name }}</td>
                      <td>
                        <snt-badge [label]="p.isPublished ? 'Published' : 'Draft'" [variant]="p.isPublished ? 'success' : 'warning'" />
                      </td>
                      <td class="text-muted">{{ p.updatedAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <div class="row-actions">
                          <a [routerLink]="['/page-builder', p.id]" class="btn btn-ghost btn-sm">Edit →</a>
                          <a [href]="'/page/' + p.branchId + '/' + p.slug" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Preview ↗</a>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </snt-page-shell>

    <snt-page-form
      [open]="formOpen()"
      [page]="null"
      (saved)="onPageCreated($event)"
      (cancel)="formOpen.set(false)"
    />
  `,
  styles: [`
    .slug-pill {
      font-family: monospace; font-size: var(--font-size-xs); font-weight: 600;
      background: var(--color-bg); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: var(--radius-md); color: var(--color-text-muted);
    }
    .row-actions { display: flex; gap: 4px; }
    .btn-sm { padding: 5px 10px; font-size: var(--font-size-xs); }
    .text-muted { color: var(--color-text-muted); }
  `],
})
export class PageBuilderComponent implements OnInit {
  private readonly svc        = inject(PageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state    = signal<LoadState>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly pages    = signal<Page[]>([]);
  readonly formOpen = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set('loading');
    this.svc.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (data) => { this.pages.set(data); this.state.set('ready'); },
        error: (e: Error) => { this.errorMsg.set(e.message); this.state.set('error'); },
      });
  }

  onPageCreated(p: Page): void {
    this.formOpen.set(false);
    this.pages.update((list) => [p, ...list]);
  }
}
