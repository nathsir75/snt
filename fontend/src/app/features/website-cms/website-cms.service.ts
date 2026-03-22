import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WebsiteCmsConfig, HomePageContent, AboutPageContent,
  ContactPageContent, BecomePartnerPageContent, GlobalSiteContent,
  SiteCollectionItem, SiteCollectionType, SiteEnquiry,
} from './website-cms.models';
import { DEFAULT_CMS_CONFIG } from './website-cms.defaults';

const STORAGE_KEY = 'snt_website_cms_v2';

@Injectable({ providedIn: 'root' })
export class WebsiteCmsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private readonly _config = signal<WebsiteCmsConfig>(this.loadLocal());

  readonly config        = this._config.asReadonly();
  readonly global        = computed(() => this._config().global);
  readonly home          = computed(() => this._config().home);
  readonly about         = computed(() => this._config().about);
  readonly contact       = computed(() => this._config().contact);
  readonly becomePartner = computed(() => this._config().becomePartner);
  readonly seo           = computed(() => this._config().seo);
  readonly lastUpdated   = computed(() => this._config().lastUpdated);

  // ── Load from API (called on app init / CMS open) ────────────────────────

  loadFromApi(): Observable<unknown> {
    return this.http.get<Record<string, unknown>>(`${this.base}/site-settings/public`).pipe(
      tap((settings) => {
        // Merge API settings into local config
        const merged = this.deepMerge(DEFAULT_CMS_CONFIG, this.apiToConfig(settings));
        this._config.set(merged);
        this.persist(merged);
      }),
      catchError(() => of(null)),
    );
  }

  // ── Admin save methods ────────────────────────────────────────────────────

  saveGlobal(data: GlobalSiteContent): Observable<unknown> {
    this.patch({ global: data });
    return this.http.put(`${this.base}/site-settings`, this.configToApi(data)).pipe(
      catchError(() => of(null)),
    );
  }

  saveHome(data: HomePageContent): void { this.patch({ home: data }); }
  saveAbout(data: AboutPageContent): void { this.patch({ about: data }); }
  saveContact(data: ContactPageContent): void { this.patch({ contact: data }); }
  saveBecomePartner(data: BecomePartnerPageContent): void { this.patch({ becomePartner: data }); }
  saveSeo(data: WebsiteCmsConfig['seo']): void { this.patch({ seo: data }); }

  resetToDefaults(): void {
    const fresh = { ...DEFAULT_CMS_CONFIG, lastUpdated: new Date().toISOString(), updatedBy: 'super_admin' };
    this._config.set(fresh);
    this.persist(fresh);
  }

  // ── Collections API ───────────────────────────────────────────────────────

  listCollections(type?: SiteCollectionType): Observable<SiteCollectionItem[]> {
    const params = type ? `?type=${type}` : '';
    return this.http.get<SiteCollectionItem[]>(`${this.base}/site-collections${params}`);
  }

  listPublicCollections(type: SiteCollectionType): Observable<SiteCollectionItem[]> {
    return this.http.get<SiteCollectionItem[]>(`${this.base}/site-collections/public/${type}`);
  }

  createCollection(data: Partial<SiteCollectionItem>): Observable<SiteCollectionItem> {
    return this.http.post<SiteCollectionItem>(`${this.base}/site-collections`, data);
  }

  updateCollection(id: number, data: Partial<SiteCollectionItem>): Observable<SiteCollectionItem> {
    return this.http.patch<SiteCollectionItem>(`${this.base}/site-collections/${id}`, data);
  }

  deleteCollection(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/site-collections/${id}`);
  }

  togglePublishCollection(id: number): Observable<SiteCollectionItem> {
    return this.http.post<SiteCollectionItem>(`${this.base}/site-collections/${id}/toggle-publish`, {});
  }

  // ── Site Enquiries API ────────────────────────────────────────────────────

  listEnquiries(type?: string, status?: string): Observable<SiteEnquiry[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.http.get<SiteEnquiry[]>(`${this.base}/site-enquiries${qs ? '?' + qs : ''}`);
  }

  updateEnquiry(id: number, data: { status?: string; notes?: string }): Observable<SiteEnquiry> {
    return this.http.patch<SiteEnquiry>(`${this.base}/site-enquiries/${id}`, data);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private patch(partial: Partial<WebsiteCmsConfig>): void {
    const updated: WebsiteCmsConfig = {
      ...this._config(),
      ...partial,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'super_admin',
    };
    this._config.set(updated);
    this.persist(updated);
  }

  private persist(config: WebsiteCmsConfig): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* ignore */ }
  }

  private loadLocal(): WebsiteCmsConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.deepMerge(DEFAULT_CMS_CONFIG, JSON.parse(raw) as WebsiteCmsConfig);
    } catch { /* corrupt */ }
    return { ...DEFAULT_CMS_CONFIG };
  }

  private apiToConfig(api: Record<string, unknown>): Partial<WebsiteCmsConfig> {
    return {
      global: {
        siteName: (api['siteName'] as string) ?? DEFAULT_CMS_CONFIG.global.siteName,
        tagline: (api['tagline'] as string) ?? DEFAULT_CMS_CONFIG.global.tagline,
        logoText: (api['logoText'] as string) ?? DEFAULT_CMS_CONFIG.global.logoText,
        logoUrl: (api['logoUrl'] as string) ?? '',
        supportEmail: (api['supportEmail'] as string) ?? '',
        supportPhone: (api['supportPhone'] as string) ?? '',
        whatsapp: (api['whatsapp'] as string) ?? '',
        address: (api['address'] as string) ?? '',
        mapLink: (api['mapLink'] as string) ?? '',
        workingHours: (api['workingHours'] as string) ?? '',
        footerDesc: (api['footerDesc'] as string) ?? DEFAULT_CMS_CONFIG.global.footerDesc,
        footerCopyright: (api['footerCopyright'] as string) ?? DEFAULT_CMS_CONFIG.global.footerCopyright,
        primaryColor: (api['primaryColor'] as string) ?? '#6366f1',
        socialLinks: (api['socialLinks'] as any[]) ?? [],
        navItems: (api['navItems'] as any[]) ?? [],
        announcementBar: (api['announcementBar'] as any) ?? { visible: false, text: '', bgColor: '#6366f1' },
      },
    };
  }

  private configToApi(global: GlobalSiteContent): Record<string, unknown> {
    return {
      siteName: global.siteName,
      tagline: global.tagline,
      logoText: global.logoText,
      logoUrl: global.logoUrl,
      supportEmail: global.supportEmail,
      supportPhone: global.supportPhone,
      whatsapp: global.whatsapp,
      address: global.address,
      mapLink: global.mapLink,
      workingHours: global.workingHours,
      footerDesc: global.footerDesc,
      footerCopyright: global.footerCopyright,
      primaryColor: global.primaryColor,
      socialLinks: global.socialLinks,
      navItems: global.navItems,
      announcementBar: global.announcementBar,
    };
  }

  private deepMerge<T extends object>(defaults: T, saved: Partial<T>): T {
    const result = { ...defaults } as T;
    for (const key of Object.keys(saved) as (keyof T)[]) {
      const sv = saved[key];
      const dv = defaults[key];
      if (sv !== null && sv !== undefined) {
        if (typeof sv === 'object' && !Array.isArray(sv) && typeof dv === 'object' && dv !== null && !Array.isArray(dv)) {
          result[key] = this.deepMerge(dv as object, sv as object) as T[keyof T];
        } else {
          result[key] = sv as T[keyof T];
        }
      }
    }
    return result;
  }
}
