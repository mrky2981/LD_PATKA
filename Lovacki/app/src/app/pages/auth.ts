import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubService } from '../core/club';
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
            <span>{{ s().displayName }}</span>
            <input formControlName="displayName" autocomplete="name" />
          </label>
          <label>
            <span>{{ s().licenseNumber }}</span>
            <input formControlName="licenseNumber" autocomplete="off" />
          </label>
          <label>
            <span>{{ s().username }}</span>
            <input formControlName="username" autocomplete="username" />
          </label>
        } @else {
          <label>
            <span>{{ s().loginIdentifier }}</span>
            <input formControlName="username" autocomplete="username" />
          </label>
        }
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
  readonly club = inject(ClubService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly register = signal(false);
  readonly s = this.club.strings;
  readonly form = this.fb.nonNullable.group({
    displayName: [''],
    licenseNumber: [''],
    username: ['', Validators.required],
    password: ['', Validators.required],
    confirm: [''],
    adminCode: [''],
  });

  async submit(): Promise<void> {
    const value = this.form.getRawValue();
    const ok = this.register()
      ? await this.club.register(
          value.displayName,
          value.username,
          value.password,
          value.confirm,
          value.adminCode,
          value.licenseNumber,
        )
      : await this.club.login(value.username, value.password);
    if (ok) {
      await this.router.navigateByUrl('/map');
    }
  }
}
