import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CollegePartnershipService } from '../../college-partnerships/college-partnership.service';
import { COLLEGE_PROGRAMS, PARTNERSHIP_MODES, PARTNERSHIP_TIMELINES } from '../../college-partnerships/college-partnership.models';

@Component({
  selector: 'app-college-partnerships',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <!-- Text LEFT -->
        <div class="hero-text">
          <p class="hero-eyebrow">🎓 Academia + Industry</p>
          <h1 class="hero-title">College &amp; University Partnerships</h1>
          <p class="hero-sub">Bridge the gap between academia and industry. Partner with us to provide your students with cutting-edge tech training and guaranteed placement support.</p>
          <div class="hero-pills">
            <span class="pill">📜 MOU &amp; Certification</span>
            <span class="pill">🧑💼 Expert Faculty</span>
            <span class="pill">🎯 Placement Cell</span>
          </div>
        </div>
        <!-- Image RIGHT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- campus building -->
            <rect x="120" y="100" width="180" height="140" rx="4" fill="#1e293b" stroke="#11998e" stroke-width="2"/>
            <rect x="140" y="120" width="40" height="40" rx="2" fill="#0f172a" stroke="#11998e" stroke-width="1"/>
            <rect x="200" y="120" width="40" height="40" rx="2" fill="#0f172a" stroke="#11998e" stroke-width="1"/>
            <rect x="160" y="180" width="100" height="60" rx="2" fill="#0f172a"/>
            <!-- roof -->
            <polygon points="110,100 210,50 310,100" fill="#11998e" opacity=".8"/>
            <!-- flag -->
            <line x1="210" y1="50" x2="210" y2="20" stroke="#11998e" stroke-width="2"/>
            <rect x="210" y="20" width="20" height="14" rx="2" fill="#38ef7d" opacity=".8"/>
            <!-- handshake badge -->
            <rect x="290" y="60" width="110" height="52" rx="10" fill="rgba(17,153,142,.15)" stroke="rgba(17,153,142,.4)" stroke-width="1.5"/>
            <text x="345" y="82" text-anchor="middle" font-size="20" font-family="system-ui">🤝</text>
            <text x="345" y="100" text-anchor="middle" font-size="9" fill="#6ee7b7" font-family="system-ui" font-weight="700">Partnership</text>
            <!-- students -->
            <circle cx="60" cy="200" r="26" fill="#1e293b" stroke="#11998e" stroke-width="2"/>
            <text x="60" y="208" text-anchor="middle" font-size="18" font-family="system-ui">👨🎓</text>
            <circle cx="360" cy="200" r="26" fill="#1e293b" stroke="#38ef7d" stroke-width="2"/>
            <text x="360" y="208" text-anchor="middle" font-size="18" font-family="system-ui">👩🎓</text>
            <!-- MOU doc -->
            <rect x="30" y="260" width="90" height="44" rx="8" fill="rgba(17,153,142,.15)" stroke="rgba(17,153,142,.4)" stroke-width="1.5"/>
            <text x="75" y="279" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">📜 MOU</text>
            <text x="75" y="294" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Signed</text>
            <!-- placement badge -->
            <rect x="300" y="260" width="100" height="44" rx="8" fill="rgba(56,239,125,.15)" stroke="rgba(56,239,125,.4)" stroke-width="1.5"/>
            <text x="350" y="279" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">🏆 500+</text>
            <text x="350" y="294" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Hiring Partners</text>
          </svg>
        </div>
      </div>
    </section>

    <section class="benefits">
      <div class="container">
        <h2>Partnership Benefits</h2>
        <div class="grid">
          <div class="card">
            <h3>Industry Curriculum</h3>
            <p>Updated curriculum aligned with current industry demands and hiring trends</p>
          </div>
          <div class="card">
            <h3>Placement Support</h3>
            <p>Dedicated placement cell with 500+ hiring partners across India</p>
          </div>
          <div class="card">
            <h3>Expert Faculty</h3>
            <p>Guest lectures and workshops by working professionals</p>
          </div>
          <div class="card">
            <h3>MOU &amp; Certification</h3>
            <p>Formal MOU with co-branded certificates for your students</p>
          </div>
        </div>
      </div>
    </section>

    <section class="programs">
      <div class="container">
        <h2>Programs We Offer</h2>
        <div class="program-grid">
          @for (program of programs; track program) {
            <div class="program-tag">{{ program }}</div>
          }
        </div>
      </div>
    </section>

    <section class="enquiry-form">
      <div class="container">
        <h2>Partner With Us</h2>
        @if (submitted) {
          <div class="success-message">
            <h3>Enquiry Received!</h3>
            <p>Thank you for your interest. Our partnerships team will reach out within 48 hours.</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label>Contact Person Name *</label>
                <input type="text" formControlName="contactPerson" class="form-control">
              </div>
              <div class="form-group">
                <label>Designation *</label>
                <input type="text" formControlName="designation" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Institution Name *</label>
                <input type="text" formControlName="collegeName" class="form-control">
              </div>
              <div class="form-group">
                <label>Email *</label>
                <input type="email" formControlName="email" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Phone *</label>
                <input type="tel" formControlName="phone" class="form-control">
              </div>
              <div class="form-group">
                <label>City *</label>
                <input type="text" formControlName="city" class="form-control">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Student Strength *</label>
                <input type="number" formControlName="numberOfStudents" class="form-control" min="1">
              </div>
              <div class="form-group">
                <label>Partnership Mode *</label>
                <select formControlName="mode" class="form-control">
                  <option value="">Select mode</option>
                  @for (m of modes; track m.value) {
                    <option [value]="m.value">{{ m.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Expected Timeline *</label>
                <select formControlName="timeline" class="form-control">
                  <option value="">Select timeline</option>
                  @for (t of timelines; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Programs of Interest</label>
                <select formControlName="programsInterested" class="form-control">
                  <option value="">Select program</option>
                  @for (p of programs; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Message / Requirements</label>
              <textarea formControlName="message" rows="4" class="form-control"></textarea>
            </div>

            <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
              {{ loading ? 'Submitting...' : 'Send Enquiry' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0d7a71 100%);
      padding: 72px 0;
    }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-text { display: flex; flex-direction: column; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(17,153,142,.3)); }
    .hero-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6ee7b7; margin-bottom: 10px; }
    .hero-title { font-size: clamp(26px, 3.5vw, 44px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15; }
    .hero-sub { font-size: 16px; color: #a7f3d0; line-height: 1.75; margin-bottom: 24px; max-width: 460px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: rgba(17,153,142,.2); border: 1px solid rgba(17,153,142,.5); color: #6ee7b7; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .benefits, .programs, .enquiry-form {
      padding: 60px 20px;
    }
    .benefits {
      background: #f8f9fa;
    }
    h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h3 {
      color: #11998e;
      margin-bottom: 1rem;
    }
    .program-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }
    .program-tag {
      background: #11998e;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      font-weight: 600;
    }
    .enquiry-form {
      background: #f8f9fa;
    }
    form {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }
    .form-control {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #11998e;
    }
    textarea.form-control {
      resize: vertical;
    }
    .btn-primary {
      background: #11998e;
      color: white;
      padding: 1rem 2rem;
      border: none;
      border-radius: 4px;
      font-size: 1.1rem;
      cursor: pointer;
      width: 100%;
      margin-top: 1rem;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0d7a71;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .success-message {
      max-width: 600px;
      margin: 0 auto;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
    }
    .success-message h3 {
      color: #155724;
      margin-bottom: 1rem;
    }
    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CollegePartnershipsComponent {
  private fb = inject(FormBuilder);
  private service = inject(CollegePartnershipService);
  private destroyRef = inject(DestroyRef);

  programs = COLLEGE_PROGRAMS;
  modes = PARTNERSHIP_MODES;
  timelines = PARTNERSHIP_TIMELINES;

  loading = false;
  submitted = false;

  form = this.fb.group({
    contactPerson:      ['', Validators.required],
    designation:        ['', Validators.required],
    collegeName:        ['', Validators.required],
    email:              ['', [Validators.required, Validators.email]],
    phone:              ['', Validators.required],
    city:               ['', Validators.required],
    state:              [''],
    numberOfStudents:   [null as number | null, [Validators.required, Validators.min(1)]],
    mode:               ['', Validators.required],
    timeline:           ['', Validators.required],
    programsInterested: [''],
    message:            ['']
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const v = this.form.getRawValue();
    const payload = {
      contactPerson:      v.contactPerson!,
      collegeName:        v.collegeName!,
      email:              v.email!,
      phone:              v.phone!,
      city:               v.city!,
      state:              v.state || '',
      numberOfStudents:   v.numberOfStudents ?? undefined,
      departments:        v.designation || undefined,
      programsInterested: v.programsInterested || 'General',
      mode:               v.mode as any,
      timeline:           v.timeline as any,
      message:            v.message || undefined,
    };
    this.service.submitPublic(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitted = true;
          this.loading = false;
        },
        error: () => {
          alert('Failed to submit enquiry. Please try again.');
          this.loading = false;
        }
      });
  }
}
