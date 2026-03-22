import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'snt-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer" [class.drawer--wide]="wide" role="dialog" [attr.aria-label]="title">
        <div class="drawer__header">
          <div>
            <h2 class="drawer__title">{{ title }}</h2>
            @if (subtitle) {
              <p class="drawer__subtitle">{{ subtitle }}</p>
            }
          </div>
          <button class="drawer__close" (click)="closeDrawer()" aria-label="Close drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="drawer__body">
          <ng-content />
        </div>
      </aside>
    }
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.35);
      z-index: 200;
      animation: fade-in .15s ease;
    }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 480px; max-width: 95vw;
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
      z-index: 201;
      display: flex; flex-direction: column;
      animation: slide-in .2s ease;
    }
    .drawer--wide { width: 600px; }
    .drawer__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    .drawer__title { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
    .drawer__subtitle { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; }
    .drawer__close {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: var(--radius-md);
      color: var(--color-text-muted); flex-shrink: 0; margin-top: 2px;
      transition: background .15s, color .15s;
      &:hover { background: var(--color-bg); color: var(--color-text); }
    }
    .drawer__body { flex: 1; overflow-y: auto; padding: 24px; }
    @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `],
})
export class DrawerComponent {
  @Input() open = false;
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() wide = false;

  @Output() closed = new EventEmitter<void>();

  closeDrawer(): void {
    this.closed.emit();
  }
}
