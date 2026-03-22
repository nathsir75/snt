import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CareerService } from '../../careers/career.service';
import {
  OPEN_ROLES, CareerRole,
  EXPERIENCE_RANGE_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, NOTICE_PERIOD_OPTIONS,
} from '../../careers/career.models';

type FormStep = 1 | 2 | 3;

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <!-- Image LEFT -->
        <div class="hero-visual">
          <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" class="hero-svg">
            <!-- office desk -->
            <rect x="40" y="230" width="340" height="12" rx="3" fill="#334155"/>
            <!-- monitor -->
            <rect x="130" y="80" width="200" height="150" rx="8" fill="#1e293b" stroke="#667eea" stroke-width="2"/>
            <rect x="140" y="90" width="180" height="130" rx="4" fill="#0f172a"/>
            <!-- hiring dashboard on screen -->
            <rect x="148" y="98" width="80" height="8" rx="2" fill="#667eea" opacity=".9"/>
            <rect x="148" y="112" width="50" height="6" rx="2" fill="#8b5cf6" opacity=".7"/>
            <rect x="148" y="124" width="70" height="6" rx="2" fill="#06b6d4" opacity=".6"/>
            <!-- candidate cards -->
            <rect x="148" y="138" width="164" height="28" rx="4" fill="rgba(102,126,234,.15)" stroke="rgba(102,126,234,.4)" stroke-width="1"/>
            <circle cx="162" cy="152" r="8" fill="#667eea"/>
            <text x="162" y="156" text-anchor="middle" font-size="8" fill="#fff" font-family="system-ui">A</text>
            <rect x="176" y="146" width="60" height="5" rx="2" fill="#667eea" opacity=".7"/>
            <rect x="176" y="155" width="40" height="4" rx="2" fill="#94a3b8" opacity=".5"/>
            <rect x="148" y="172" width="164" height="28" rx="4" fill="rgba(139,92,246,.15)" stroke="rgba(139,92,246,.4)" stroke-width="1"/>
            <circle cx="162" cy="186" r="8" fill="#8b5cf6"/>
            <text x="162" y="190" text-anchor="middle" font-size="8" fill="#fff" font-family="system-ui">B</text>
            <rect x="176" y="180" width="55" height="5" rx="2" fill="#8b5cf6" opacity=".7"/>
            <rect x="176" y="189" width="35" height="4" rx="2" fill="#94a3b8" opacity=".5"/>
            <!-- monitor stand -->
            <rect x="218" y="230" width="24" height="20" rx="2" fill="#1e293b"/>
            <!-- floating role badges -->
            <rect x="20" y="80" width="100" height="44" rx="8" fill="rgba(102,126,234,.15)" stroke="rgba(102,126,234,.4)" stroke-width="1.5"/>
            <text x="70" y="99" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui" font-weight="700">👨🏫 Trainer</text>
            <text x="70" y="114" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Full Time</text>
            <rect x="310" y="140" width="100" height="44" rx="8" fill="rgba(5,150,105,.15)" stroke="rgba(5,150,105,.4)" stroke-width="1.5"/>
            <text x="360" y="159" text-anchor="middle" font-size="10" fill="#6ee7b7" font-family="system-ui" font-weight="700">💼 Manager</text>
            <text x="360" y="174" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Operations</text>
            <rect x="20" y="200" width="100" height="44" rx="8" fill="rgba(6,182,212,.15)" stroke="rgba(6,182,212,.4)" stroke-width="1.5"/>
            <text x="70" y="219" text-anchor="middle" font-size="10" fill="#67e8f9" font-family="system-ui" font-weight="700">💻 Developer</text>
            <text x="70" y="234" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">Tech Team</text>
          </svg>
        </div>
        <!-- Text RIGHT -->
        <div class="hero-text">
          <p class="hero-eyebrow">💼 We're Hiring</p>
          <h1 class="hero-title">Join Our Team</h1>
          <p class="hero-sub">Build your career with India's fastest-growing IT training franchise. We're hiring passionate trainers, managers, and tech professionals.</p>
          <div class="hero-pills">
            <span class="pill">🎓 Trainers</span>
            <span class="pill">💼 Operations</span>
            <span class="pill">💻 Tech</span>
            <span class="pill">📊 Sales</span>
          </div>
        </div>
      </div>
    </section>

    <section class="open-roles">
      <div class="container">
        <h2>Open Positions</h2>
        <div class="roles-grid">
          @for (role of openRoles; track role.id) {
            <div class="role-card" (click)="selectRole(role)">
              <div class="role-header">
                <h3>{{ role.title }}</h3>
                <span class="role-badge">{{ departmentLabel(role.department) }}</span>
              </div>
              <p class="role-meta">📍 {{ role.location }} • 💼 {{ typeLabel(role.type) }} • 🎯 {{ expLabel(role.experience) }}</p>
              <p class="role-desc">{{ role.description }}</p>
              <div class="role-skills">
                @for (skill of role.skills; track skill) {
                  <span class="skill-tag">{{ skill }}</span>
                }
              </div>
              <button class="btn-apply">Apply Now →</button>
            </div>
          }
        </div>
      </div>
    </section>

    @if (showForm()) {
      <div class="form-overlay" (click)="closeForm()"></div>
      <div class="form-modal">
        <div class="form-modal-header">
          <h2>Apply for {{ selectedRole()?.title }}</h2>
          <button class="btn-close" (click)="closeForm()">✕</button>
        </div>

        <div class="form-steps">
          <div class="step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
            <span class="step-num">1</span>
            <span class="step-label">Personal</span>
          </div>
          <div class="step" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2">
            <span class="step-num">2</span>
            <span class="step-label">Experience</span>
          </div>
          <div class="step" [class.active]="currentStep() === 3">
            <span class="step-num">3</span>
            <span class="step-label">Submit</span>
          </div>
        </div>

        @if (submitted()) {
          <div class="success-message">
            <h3>✓ Application Submitted!</h3>
            <p>Thank you for applying. Our HR team will review your profile and reach out within 3–5 business days.</p>
            <button class="btn-primary" (click)="closeForm()">Close</button>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">

            @if (currentStep() === 1) {
              <div class="form-step">
                <div class="form-row">
                  <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" formControlName="fullName" class="form-control">
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
                <div class="form-actions">
                  <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
                  <button type="button" class="btn-primary" (click)="nextStep()" [disabled]="!isStep1Valid()">Next →</button>
                </div>
              </div>
            }

            @if (currentStep() === 2) {
              <div class="form-step">
                <div class="form-row">
                  <div class="form-group">
                    <label>Current Role</label>
                    <input type="text" formControlName="currentRole" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Current Company</label>
                    <input type="text" formControlName="currentCompany" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Experience *</label>
                    <select formControlName="experienceRange" class="form-control">
                      <option value="">Select experience</option>
                      @for (exp of experienceOptions; track exp.value) {
                        <option [value]="exp.value">{{ exp.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Employment Type *</label>
                    <select formControlName="employmentTypePreference" class="form-control">
                      <option value="">Select type</option>
                      @for (type of employmentTypeOptions; track type.value) {
                        <option [value]="type.value">{{ type.label }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Key Skills (comma-separated) *</label>
                  <input type="text" formControlName="skills" class="form-control" placeholder="e.g. Java, Spring Boot, Angular">
                </div>
                <div class="form-actions">
                  <button type="button" class="btn-secondary" (click)="prevStep()">← Back</button>
                  <button type="button" class="btn-primary" (click)="nextStep()" [disabled]="!isStep2Valid()">Next →</button>
                </div>
              </div>
            }

            @if (currentStep() === 3) {
              <div class="form-step">
                <div class="form-group">
                  <label>Resume URL (Google Drive / Dropbox) *</label>
                  <input type="url" formControlName="resumeUrl" class="form-control" placeholder="https://drive.google.com/...">
                </div>
                <div class="form-group">
                  <label>LinkedIn Profile</label>
                  <input type="url" formControlName="linkedinUrl" class="form-control" placeholder="https://linkedin.com/in/...">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Expected CTC (LPA)</label>
                    <input type="text" formControlName="expectedCtc" class="form-control" placeholder="e.g. 6–8 LPA">
                  </div>
                  <div class="form-group">
                    <label>Notice Period</label>
                    <select formControlName="noticePeriod" class="form-control">
                      <option value="">Select period</option>
                      @for (period of noticePeriodOptions; track period) {
                        <option [value]="period">{{ period }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Cover Note / Why SNT?</label>
                  <textarea formControlName="coverNote" rows="4" class="form-control" placeholder="Tell us why you want to join SNT..."></textarea>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn-secondary" (click)="prevStep()">← Back</button>
                  <button type="submit" class="btn-primary" [disabled]="form.invalid || loading()">
                    {{ loading() ? 'Submitting...' : 'Submit Application' }}
                  </button>
                </div>
              </div>
            }

          </form>
        }
      </div>
    }
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%);
      padding: 72px 0;
    }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .hero-visual { display: flex; align-items: center; justify-content: center; }
    .hero-svg { width: 100%; max-width: 420px; height: auto; filter: drop-shadow(0 16px 32px rgba(102,126,234,.3)); }
    .hero-text { display: flex; flex-direction: column; }
    .hero-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 10px; }
    .hero-title { font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15; }
    .hero-sub { font-size: 16px; color: #c7d2fe; line-height: 1.75; margin-bottom: 24px; max-width: 460px; }
    .hero-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .open-roles {
      padding: 60px 20px;
      background: #f8f9fa;
    }
    h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }
    .role-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all .2s;
    }
    .role-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      transform: translateY(-4px);
    }
    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .role-header h3 {
      font-size: 1.25rem;
      color: #111827;
      margin: 0;
    }
    .role-badge {
      background: #eef2ff;
      color: #6366f1;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .role-meta {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }
    .role-desc {
      font-size: 0.9rem;
      color: #374151;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    .role-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .skill-tag {
      background: #f3f4f6;
      color: #374151;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .btn-apply {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: background .2s;
    }
    .btn-apply:hover {
      background: #5568d3;
    }
    .form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
    }
    .form-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 1001;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .form-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .form-modal-header h2 {
      font-size: 1.5rem;
      margin: 0;
      text-align: left;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }
    .btn-close:hover {
      background: #f3f4f6;
    }
    .form-steps {
      display: flex;
      justify-content: space-between;
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      position: relative;
    }
    .step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 16px;
      left: 60%;
      width: 80%;
      height: 2px;
      background: #e5e7eb;
    }
    .step.completed:not(:last-child)::after {
      background: #667eea;
    }
    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      z-index: 1;
    }
    .step.active .step-num {
      background: #667eea;
      color: white;
    }
    .step.completed .step-num {
      background: #667eea;
      color: white;
    }
    .step-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 600;
    }
    .step.active .step-label {
      color: #667eea;
    }
    .form-step {
      padding: 2rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }
    .form-control {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea.form-control {
      resize: vertical;
    }
    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }
    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all .2s;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
    .btn-secondary:hover {
      background: #e5e7eb;
    }
    .success-message {
      padding: 3rem 2rem;
      text-align: center;
    }
    .success-message h3 {
      color: #059669;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .success-message p {
      color: #6b7280;
      margin-bottom: 2rem;
    }
    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .form-row {
        grid-template-columns: 1fr;
      }
      .form-modal {
        width: 95%;
      }
    }
  `]
})
export class CareersComponent {
  private fb = inject(FormBuilder);
  private service = inject(CareerService);
  private destroyRef = inject(DestroyRef);

  openRoles = OPEN_ROLES;
  experienceOptions = EXPERIENCE_RANGE_OPTIONS;
  employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;
  noticePeriodOptions = NOTICE_PERIOD_OPTIONS;

  showForm = signal(false);
  selectedRole = signal<CareerRole | null>(null);
  currentStep = signal<FormStep>(1);
  loading = signal(false);
  submitted = signal(false);

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    city: ['', Validators.required],
    currentRole: [''],
    currentCompany: [''],
    experienceRange: ['', Validators.required],
    department: [''],
    roleAppliedFor: [''],
    employmentTypePreference: ['', Validators.required],
    skills: ['', Validators.required],
    linkedinUrl: [''],
    portfolioUrl: [''],
    resumeUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    coverNote: [''],
    expectedCtc: [''],
    noticePeriod: ['']
  });

  selectRole(role: CareerRole): void {
    this.selectedRole.set(role);
    this.form.patchValue({
      department: role.department,
      roleAppliedFor: role.title,
    });
    this.showForm.set(true);
    this.currentStep.set(1);
    this.submitted.set(false);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.form.reset();
    this.currentStep.set(1);
    this.submitted.set(false);
  }

  nextStep(): void {
    if (this.currentStep() < 3) {
      this.currentStep.update(s => (s + 1) as FormStep);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => (s - 1) as FormStep);
    }
  }

  isStep1Valid(): boolean {
    return !!(
      this.form.get('fullName')?.valid &&
      this.form.get('email')?.valid &&
      this.form.get('phone')?.valid &&
      this.form.get('city')?.valid
    );
  }

  isStep2Valid(): boolean {
    return !!(
      this.form.get('experienceRange')?.valid &&
      this.form.get('employmentTypePreference')?.valid &&
      this.form.get('skills')?.valid
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.service.submitPublic(this.form.value as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.loading.set(false);
        },
        error: () => {
          alert('Failed to submit application. Please try again.');
          this.loading.set(false);
        }
      });
  }

  departmentLabel(dept: string): string {
    const map: Record<string, string> = {
      training: 'Training',
      operations: 'Operations',
      hr: 'HR',
      sales: 'Sales',
      marketing: 'Marketing',
      technology: 'Tech',
      finance: 'Finance',
      content: 'Content',
    };
    return map[dept] || dept;
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      remote: 'Remote',
    };
    return map[type] || type;
  }

  expLabel(exp: string): string {
    const map: Record<string, string> = {
      fresher: '0–1 yr',
      '1_2_years': '1–2 yrs',
      '2_5_years': '2–5 yrs',
      '5_10_years': '5–10 yrs',
      '10_plus_years': '10+ yrs',
    };
    return map[exp] || exp;
  }
}
