import {
  Component, inject, input, output, signal,
  OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { BranchCmsService } from '../branch-cms.service';
import { BranchCmsSettings, NavItem, DEFAULT_NAV_ITEMS } from '../branch-cms.models';
import { CMS_EDITOR_IMPORTS, CMS_INPUT_STYLES } from '../../../features/website-cms/editors/cms-shared.component';

@Component({
  selector: 'snt-bcms-nav-editor',
  standalone: true,
  imports: [...CMS_EDITOR_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cms-editor">
      <snt-cms-section title="Navigation Menu Items" icon="🧭">
        <p class="nav-hint">Items appear in the branch website header. Use Order to control sequence.</p>

        @for (item of items(); track $index) {
          <div class="nav-item-row">
            <div class="nav-item-num">{{ $index + 1 }}</div>
            <div class="nav-item-fields">
              <div class="cms-row-3">
                <snt-cms-field label="Label">
                  <input class="cms-input" [value]="item.label"
                    (input)="updateItem($index, 'label', $any($event.target).value)"
                    placeholder="Home" />
                </snt-cms-field>
                <snt-cms-field label="Slug" hint="e.g. about">
                  <input class="cms-input" [value]="item.slug"
                    (input)="updateItem($index, 'slug', $any($event.target).value)"
                    placeholder="about" />
                </snt-cms-field>
                <snt-cms-field label="Order">
                  <input class="cms-input" type="number"
                    [value]="item.order"
                    (input)="updateItem($index, 'order', +$any($event.target).value)"
                    min="1" />
                </snt-cms-field>
              </div>
              <div class="cms-toggle-row">
                <input type="checkbox" class="cms-toggle"
                  [checked]="item.visible"
                  (change)="updateItem($index, 'visible', $any($event.target).checked)"
                  [id]="'nav-vis-' + $index" />
                <label class="cms-toggle-label" [for]="'nav-vis-' + $index">Visible in menu</label>
              </div>
            </div>
            <button class="cms-remove-btn" (click)="remove($index)">✕</button>
          </div>
          <div class="cms-divider"></div>
        }

        <button class="cms-add-btn" (click)="add()">+ Add Menu Item</button>
      </snt-cms-section>

      <snt-cms-save-bar note="Saves navigation to your branch settings." (saved)="save()" (cancelled)="reset()" />
    </div>
  `,
  styles: [CMS_INPUT_STYLES + `
    .cms-editor { max-width: 860px; }
    .nav-hint { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
    .nav-item-row { display: flex; gap: 12px; align-items: flex-start; }
    .nav-item-num {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; margin-top: 28px;
      background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .nav-item-fields { flex: 1; }
  `],
})
export class BcmsNavEditorComponent implements OnInit {
  private readonly svc = inject(BranchCmsService);

  readonly settings = input.required<BranchCmsSettings>();
  readonly saved    = output<BranchCmsSettings>();

  readonly items = signal<NavItem[]>([]);

  ngOnInit(): void {
    const src = this.settings().navItems;
    this.items.set(structuredClone(src.length > 0 ? src : DEFAULT_NAV_ITEMS));
  }

  add(): void {
    const next = this.items().length + 1;
    this.items.update(list => [...list, { label: '', slug: '', order: next, visible: true }]);
  }

  remove(i: number): void {
    this.items.update(list => list.filter((_, idx) => idx !== i));
  }

  updateItem(i: number, field: keyof NavItem, value: string | number | boolean): void {
    this.items.update(list =>
      list.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    );
  }

  save(): void {
    const sorted = [...this.items()].sort((a, b) => a.order - b.order);
    this.svc.update({ navItems: sorted })
      .subscribe({ next: (s) => this.saved.emit(s), error: () => {} });
  }

  reset(): void {
    this.items.set(structuredClone(this.settings().navItems));
  }
}
