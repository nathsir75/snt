import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

// ── HO Site-Page models ───────────────────────────────────────────────────────

export type HoPageType =
  | 'home' | 'about' | 'courses' | 'contact' | 'placements'
  | 'careers' | 'internships' | 'corporate' | 'college' | 'franchise' | 'custom';

export type HoSectionType =
  | 'hero' | 'text' | 'gallery' | 'cta' | 'banner'
  | 'stats' | 'features' | 'testimonials' | 'contact' | 'collection';

export interface HoPageSection {
  id: number;
  sectionType: HoSectionType;
  title: string | null;
  order: number;
  configJson: Record<string, unknown>;
  isVisible: boolean;
}

export interface HoPage {
  id: number;
  title: string;
  slug: string;
  pageType: string;
  isPublished: boolean;
  seoJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sections: HoPageSection[];
}

export interface CreateHoPagePayload {
  title: string;
  slug: string;
  pageType?: string;
  status?: 'draft' | 'published';
}

export interface UpdateHoPagePayload {
  title?: string;
  slug?: string;
  pageType?: string;
  isPublished?: boolean;
}

export interface AddHoSectionPayload {
  sectionType: HoSectionType;
  title?: string;
  order: number;
  configJson: Record<string, unknown>;
  isVisible?: boolean;
}

export interface UpdateHoSectionPayload {
  title?: string;
  order?: number;
  configJson?: Record<string, unknown>;
  isVisible?: boolean;
}

export const HO_PAGE_TYPE_OPTIONS: { value: HoPageType; label: string }[] = [
  { value: 'home',        label: 'Home' },
  { value: 'about',       label: 'About Us' },
  { value: 'courses',     label: 'Courses' },
  { value: 'contact',     label: 'Contact' },
  { value: 'placements',  label: 'Placements' },
  { value: 'careers',     label: 'Careers' },
  { value: 'internships', label: 'Internships' },
  { value: 'corporate',   label: 'Corporate Training' },
  { value: 'college',     label: 'College Partnerships' },
  { value: 'franchise',   label: 'Franchise / Partner' },
  { value: 'custom',      label: 'Custom Page' },
];

export const HO_SECTION_TYPE_LABELS: Record<HoSectionType, string> = {
  hero:         'Hero Banner',
  text:         'Text Block',
  gallery:      'Gallery',
  cta:          'Call to Action',
  banner:       'Banner',
  stats:        'Stats',
  features:     'Feature Cards',
  testimonials: 'Testimonials',
  contact:      'Contact',
  collection:   'Collection',
};

export const HO_SECTION_TYPE_ICONS: Record<HoSectionType, string> = {
  hero:         '🦸',
  text:         '📝',
  gallery:      '🖼️',
  cta:          '📣',
  banner:       '🎯',
  stats:        '📊',
  features:     '✨',
  testimonials: '💬',
  contact:      '📬',
  collection:   '📦',
};

@Injectable({ providedIn: 'root' })
export class HoPageService {
  private readonly api = inject(ApiService);

  // ── Shared page cache — both nav editor and page builder read from here ──
  readonly pages$ = signal<HoPage[]>([]);

  loadPages(): Observable<HoPage[]> {
    return this.api.get<HoPage[]>('/site-pages').pipe(
      tap((pages) => {
        console.log('[HoPageService] loadPages — fetched', pages.length, 'pages:', pages.map(p => `${p.id}:${p.slug}`));
        this.pages$.set(pages);
      }),
    );
  }

  addToCache(page: HoPage): void {
    this.pages$.update((list) => [page, ...list]);
    console.log('[HoPageService] addToCache — added page', page.id, page.slug, '— total:', this.pages$().length);
  }

  list(): Observable<HoPage[]> {
    return this.api.get<HoPage[]>('/site-pages');
  }

  getById(id: number): Observable<HoPage> {
    return this.api.get<HoPage>(`/site-pages/${id}`);
  }

  create(payload: CreateHoPagePayload): Observable<HoPage> {
    return this.api.post<HoPage>('/site-pages', payload);
  }

  update(id: number, payload: UpdateHoPagePayload): Observable<HoPage> {
    return this.api.patch<HoPage>(`/site-pages/${id}`, payload);
  }

  delete(id: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>(`/site-pages/${id}`);
  }

  addSection(pageId: number, payload: AddHoSectionPayload): Observable<HoPageSection> {
    return this.api.post<HoPageSection>(`/site-pages/${pageId}/sections`, payload);
  }

  updateSection(pageId: number, sectionId: number, payload: UpdateHoSectionPayload): Observable<HoPageSection> {
    return this.api.patch<HoPageSection>(`/site-pages/${pageId}/sections/${sectionId}`, payload);
  }

  deleteSection(pageId: number, sectionId: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>(`/site-pages/${pageId}/sections/${sectionId}`);
  }
}
