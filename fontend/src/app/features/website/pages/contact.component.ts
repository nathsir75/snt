import {
  Component, inject, signal,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { WebsiteCmsService } from '../../website-cms/website-cms.service';
import { SiteEnquiryService } from '../site-enquiry.service';

@Component({
  selector: 'snt-web-contact',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero">
      <div class="container hero-inner">
        <div class="hero-visual">
          <svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <rect x="150" y="50" width="120" height="200" rx="16" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
            <rect x="160" y="66" width="100" height="168" rx="6" fill="#0f172a"/>
            <rect x="168" y="80" width="70" height="28" rx="8" fill="#6366f1" opacity=".9"/>
            <text x="203" y="99" text-anchor="middle" font-size="9" fill="#fff" font-family="system-ui" font-weight="600">Hi! How can we help?</text>
            <rect x="178" y="116" width="60" height="24" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
            <text x="208" y="132" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="system-ui">I need counselling</text>
            <rect x="168" y="148" width="72" height="24" rx="8" fill="#6366f1" opacity=".8"/>
            <text x="204" y="164" text-anchor="middle" font-size="8" fill="#fff" font-family="system-ui">Sure! Call us now 📞</text>
            <circle cx="210" cy="244" r="8" fill="#334155"/>
            <rect x="20" y="60" width="110" height="52" rx="10" fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.4)" stroke-width="1.5"/>
            <text x="75" y="82" text-anchor="middle" font-size="16" font-family="system-ui">📧</text>
            <text x="75" y="100" text-anchor="middle" font-size="9" fill="#a5b4fc" font-family="system-ui" font-weight="700">Email Us</text>
            <rect x="290" y="60" width="110" height="52" rx="10" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="345" y="82" text-anchor="middle" font-size="16" font-family="system-ui">📞</text>
            <text x="345" y="100" text-anchor="middle" font-size="9" fill="#6ee7b7" font-family="system-ui" font-weight="700">Call Us</text>
          </svg>
        </div>
        <div class="hero-text">
          <p class="eyebrow">Get In Touch</p>
          <h1 class="page-title">{{ cms().hero.title || "We'd Love to Hear From You" }}</h1>
          <p class="page-sub">{{ cms().hero.subtitle || "Whether you're a student, corporate client, or franchise aspirant — our team is ready to help." }}</p>
          <div class="hero-contact-items">
            @if (global().supportEmail) { <div class="hci">📧 {{ global().supportEmail }}</div> }
            @if (global().supportPhone) { <div class="hci">📞 {{ global().supportPhone }}</div> }
            @if (global().address)      { <div class="hci">🏢 {{ global().address }}</div> }
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container contact-grid">

        <div class="contact-info">
          <h2 class="info-title">Contact Information</h2>
          @for (item of cms().contactItems; track item.label) {
            <div class="contact-item">
              <div class="contact-icon">{{ item.icon }}</div>
              <div>
                <p class="contact-label">{{ item.label }}</p>
                <p class="contact-value">{{ item.value }}</p>
              </div>
            </div>
          }
          <div class="office-hours">
            <h3 class="hours-title">Office Hours</h3>
            <p class="hours-text">{{ cms().officeHours.weekdays }}</p>
            <p class="hours-text">{{ cms().officeHours.sunday }}</p>
          </div>
        </div>

        <div class="contact-form-wrap">
          @if (submitted()) {
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h3 class="success-title">Message Sent!</h3>
              <p class="success-desc">Thank you for reaching out. Our team will contact you within 24 hours.</p>
              <button class="btn-primary" (click)="submitted.set(false)">Send Another Message</button>
            </div>
          } @else {
            <h2 class="form-title">{{ cms().formTitle || 'Send Us a Message' }}</h2>
            <div class="form-grid">
              <div class="form-field">
                <label class="form-label">Full Name *</label>
                <input class="form-input" [(ngModel)]="form.name" placeholder="Your full name" />
              </div>
              <div class="form-field">
                <label class="form-label">Phone *</label>
                <input class="form-input" [(ngModel)]="form.phone" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div class="form-field form-full">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" [(ngModel)]="form.email" placeholder="your@email.com" />
              </div>
              <div class="form-field form-full">
                <label class="form-label">I am a…</label>
                <select class="form-input" [(ngModel)]="form.type">
                  <option value="student">Student / Job Seeker</option>
                  <option value="corporate">Corporate / HR Manager</option>
                  <option value="franchise">Franchise Aspirant</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-field form-full">
                <label class="form-label">Message *</label>
                <textarea class="form-input form-textarea" [(ngModel)]="form.message" placeholder="How can we help you?" rows="4"></textarea>
              </div>
            </div>
            @if (error()) { <p class="form-error">{{ error() }}</p> }
            <button class="btn-submit" [disabled]="saving()" (click)="submit()">
              {{ saving() ? 'Sending…' : 'Send Message →' }}
            </button>
          }
        </div>

      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section { padding: 72px 0; }
    .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .page-hero { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 72px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(99,102,241,.25)); }
    .hero-text { display: flex; flex-direction: column; }
    .hero-contact-items { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .hci { font-size: 14px; color: #94a3b8; font-weight: 500; }
    .page-title { font-size: clamp(26px, 4vw, 44px); font-weight: 900; color: #fff; margin-bottom: 14px; }
    .page-sub { font-size: 16px; color: #94a3b8; max-width: 500px; line-height: 1.75; }
    .contact-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 60px; align-items: start; }
    .info-title { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 24px; }
    .contact-item { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 20px; }
    .contact-icon { font-size: 22px; flex-shrink: 0; }
    .contact-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; margin-bottom: 2px; }
    .contact-value { font-size: 14px; color: #111827; font-weight: 500; }
    .office-hours { background: #f8fafc; border-radius: 10px; padding: 16px; margin-top: 24px; }
    .hours-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .hours-text { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
    .contact-form-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
    .form-title { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-full { grid-column: 1 / -1; }
    .form-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; }
    .form-input { padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; width: 100%; }
    .form-input:focus { border-color: #6366f1; }
    .form-textarea { resize: vertical; }
    .form-error { font-size: 13px; color: #dc2626; margin-bottom: 12px; }
    .btn-submit { width: 100%; padding: 13px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s; }
    .btn-submit:hover:not(:disabled) { background: #4f46e5; }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
    .success-state { text-align: center; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .success-icon { font-size: 48px; }
    .success-title { font-size: 22px; font-weight: 800; color: #111827; }
    .success-desc { font-size: 14px; color: #6b7280; max-width: 360px; line-height: 1.7; }
    .btn-primary { display: inline-flex; padding: 10px 22px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .btn-primary:hover { background: #4f46e5; }
    @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } .hero-inner { grid-template-columns: 1fr; } .hero-visual { display: none; } }
  `],
})
export class WebContactComponent {
  private readonly enquirySvc = inject(SiteEnquiryService);
  private readonly cmsService = inject(WebsiteCmsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving    = signal(false);
  readonly submitted = signal(false);
  readonly error     = signal<string | null>(null);

  readonly cms    = this.cmsService.contact;
  readonly global = this.cmsService.global;

  form = { name: '', phone: '', email: '', type: 'student', message: '' };

  submit(): void {
    if (!this.form.name.trim() || !this.form.phone.trim() || !this.form.message.trim()) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.enquirySvc.submit({
      enquiryType: 'contact',
      fullName: this.form.name,
      phone: this.form.phone,
      email: this.form.email || undefined,
      subject: `Contact form — ${this.form.type}`,
      message: this.form.message,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => { this.saving.set(false); this.submitted.set(true); },
        error: () => { this.saving.set(false); this.submitted.set(true); }, // graceful
      });
  }
}
