import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

type PdfJsPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (url: string) => { promise: Promise<PdfJsDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

const PDF_JS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_JS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfJsLoadPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PDF_JS_SRC}"]`);
    const script = existing ?? document.createElement('script');

    script.src = PDF_JS_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('PDF.js failed to initialize'));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_SRC;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('PDF.js failed to load'));

    if (!existing) document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

@Component({
  selector: 'snt-pdf-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pdf-viewer" aria-label="PDF study material" (contextmenu)="blockContextMenu($event)">
      @if (totalPages() > 0) {
        <div class="pdf-viewer__toolbar" aria-label="PDF pagination">
          <button type="button" class="pdf-viewer__nav-btn" [disabled]="loading() || currentPage() <= 1" (click)="previousPage()">
            पिछला
          </button>
          <span class="pdf-viewer__page-label">{{ pageLabel() }}</span>
          <button type="button" class="pdf-viewer__nav-btn" [disabled]="loading() || currentPage() >= totalPages()" (click)="nextPage()">
            अगला
          </button>
        </div>
      }

      @if (loading()) {
        <div class="pdf-viewer__state">Loading PDF...</div>
      } @else if (error()) {
        <div class="pdf-viewer__state pdf-viewer__state--error">{{ error() }}</div>
      }

      <div class="pdf-viewer__page">
        <canvas #pageCanvas [hidden]="!totalPages()" aria-label="PDF page"></canvas>
      </div>
    </section>
  `,
  styles: [`
    .pdf-viewer {
      width: 100%;
      user-select: none;
      -webkit-user-select: none;
    }

    .pdf-viewer__toolbar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 14px;
      padding: 8px 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .pdf-viewer__nav-btn {
      padding: 7px 12px;
      border-radius: var(--radius-md);
      background: var(--layout-accent, var(--color-primary));
      color: #fff;
      font-size: var(--font-size-sm);
      font-weight: 700;
    }

    .pdf-viewer__nav-btn:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .pdf-viewer__page-label {
      min-width: 120px;
      text-align: center;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      font-weight: 700;
    }

    .pdf-viewer__page {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .pdf-viewer__page canvas {
      width: min(100%, 920px);
      height: auto;
      background: #fff;
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }

    .pdf-viewer__state {
      padding: 24px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .pdf-viewer__state--error { color: var(--color-danger); }
  `],
})
export class PdfViewerComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private isDestroyed = false;
  private renderRunId = 0;
  private pdfDocument: PdfJsDocument | null = null;
  private activeScale = 1.4;

  @ViewChild('pageCanvas') private readonly pageCanvas?: ElementRef<HTMLCanvasElement>;

  readonly pdfUrl = input.required<string>();
  readonly scale = input(1.4);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly pageLabel = signal('पृष्ठ ० / ०');

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.renderRunId += 1;
    });

    effect(() => {
      const url = this.pdfUrl();
      const scale = this.scale();
      if (!this.pageCanvas || !url) return;
      this.loadPdf(url, scale);
    });
  }

  ngAfterViewInit(): void {
    const url = this.pdfUrl();
    if (url) this.loadPdf(url, this.scale());
  }

  previousPage(): void {
    if (this.currentPage() <= 1) return;
    this.renderPage(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.renderPage(this.currentPage() + 1);
  }

  private async loadPdf(url: string, scale: number): Promise<void> {
    const runId = ++this.renderRunId;
    if (!this.pageCanvas?.nativeElement) return;

    this.loading.set(true);
    this.error.set(null);
    this.pdfDocument = null;
    this.totalPages.set(0);
    this.currentPage.set(1);
    this.updatePageLabel();

    try {
      const pdfjsLib = await loadPdfJs();
      this.pdfDocument = await pdfjsLib.getDocument(url).promise;
      this.activeScale = scale;
      this.totalPages.set(this.pdfDocument.numPages);
      await this.renderPage(1, runId);
    } catch (error) {
      if (runId === this.renderRunId) {
        console.error('[PdfViewer] Failed to render PDF:', error);
        this.error.set('Could not load PDF.');
      }
    } finally {
      if (runId === this.renderRunId) this.loading.set(false);
    }
  }

  private async renderPage(pageNumber: number, existingRunId?: number): Promise<void> {
    const runId = existingRunId ?? ++this.renderRunId;
    const pdf = this.pdfDocument;
    const canvas = this.pageCanvas?.nativeElement;
    if (!pdf || !canvas) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const targetPage = Math.min(Math.max(pageNumber, 1), pdf.numPages);
      const page = await pdf.getPage(targetPage);
      if (this.isDestroyed || runId !== this.renderRunId) return;

      const viewport = page.getViewport({ scale: this.activeScale });
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas rendering is not available');

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.setAttribute('aria-label', `Page ${targetPage}`);
      context.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
      if (this.isDestroyed || runId !== this.renderRunId) return;

      this.drawWatermark(context, canvas.width, canvas.height);
      this.currentPage.set(targetPage);
      this.updatePageLabel();
    } catch (error) {
      if (runId === this.renderRunId) {
        console.error('[PdfViewer] Failed to render page:', error);
        this.error.set('Could not load PDF page.');
      }
    } finally {
      if (runId === this.renderRunId) this.loading.set(false);
    }
  }

  blockContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private drawWatermark(context: CanvasRenderingContext2D, width: number, height: number): void {
    const email = this.auth.currentUser()?.email ?? 'SNT Education';
    const text = `SNT Education - ${email}`;
    const stepX = Math.max(360, width * 0.38);
    const stepY = Math.max(180, height * 0.18);

    context.save();
    context.globalAlpha = 0.16;
    context.fillStyle = '#0f172a';
    context.font = `${Math.max(18, Math.floor(width / 36))}px Inter, Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.rotate(-Math.PI / 4);

    for (let x = -width; x < width * 1.6; x += stepX) {
      for (let y = 0; y < height * 2; y += stepY) {
        context.fillText(text, x, y);
      }
    }

    context.restore();
  }

  private updatePageLabel(): void {
    this.pageLabel.set(`पृष्ठ ${this.toDevanagariNumber(this.currentPage())} / ${this.toDevanagariNumber(this.totalPages())}`);
  }

  private toDevanagariNumber(value: number): string {
    const digits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
  }
}
