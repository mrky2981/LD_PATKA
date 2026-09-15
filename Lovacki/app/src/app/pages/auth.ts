import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubFacade } from '../application/club-facade';
import { LanguageButton } from '../ui/language-button';

@Component({
  selector: 'app-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LanguageButton],
  template: `
    <section class="auth">
      <div class="panel">
      <div class="top">
        <app-language-button [language]="club.state().language" (changed)="club.setLanguage($event)" />
      </div>
      <div class="brand">
        <img src="icons/duck.svg" width="96" height="96" alt="" />
        <h1>LD Patka</h1>
        <p>{{ s().splashClub }}</p>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (register()) {
          <label>
            <span>{{ s().firstName }}</span>
            <input formControlName="firstName" autocomplete="given-name" />
          </label>
          <label>
            <span>{{ s().lastName }}</span>
            <input formControlName="lastName" autocomplete="family-name" />
          </label>
        }
        <label>
          <span>{{ s().licenseNumber }}</span>
          <input formControlName="licenseNumber" autocomplete="username" />
        </label>
        <label>
          <span>{{ s().password }}</span>
          <input formControlName="password" type="password" autocomplete="current-password" />
        </label>
        @if (register()) {
          <label>
            <span>{{ s().confirmPassword }}</span>
            <input formControlName="confirm" type="password" autocomplete="new-password" />
          </label>
          <label>
            <span>{{ s().adminCode }}</span>
            <input formControlName="adminCode" autocomplete="off" />
          </label>
          <p class="hint">{{ s().adminCodeHint }}</p>
        }
        @if (club.state().authError; as error) {
          <p class="error" role="alert">{{ error }}</p>
        }
        <button class="primary" type="submit">{{ register() ? s().createAccount : s().login }}</button>
      </form>
      <button class="link" type="button" (click)="register.set(!register())">
        {{ register() ? s().haveAccount : s().noAccount }}
      </button>
      <p class="seed">{{ s().seedHint }}</p>
      </div>
    </section>
  `,
  styleUrl: './auth.scss',
})
export class AuthPage {
  readonly club = inject(ClubFacade);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly register = signal(false);
  readonly s = this.club.strings;
  readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    licenseNumber: ['', Validators.required],
    password: ['', Validators.required],
    confirm: [''],
    adminCode: [''],
  });

  async submit(): Promise<void> {
    const value = this.form.getRawValue();
    const ok = this.register()
      ? await this.club.register(
          value.firstName,
          value.lastName,
          value.licenseNumber,
          value.password,
          value.confirm,
          value.adminCode,
        )
      : await this.club.login(value.licenseNumber, value.password);
    if (ok) {
      await this.router.navigateByUrl('/map');
    }
  }
}
