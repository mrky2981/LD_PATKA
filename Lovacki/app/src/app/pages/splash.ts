import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { Strings } from '../core/l10n';

@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="splash" role="status" [attr.aria-label]="strings().appName">
      <img src="icons/duck.svg" width="140" height="140" alt="" />
      <h1>LD Patka</h1>
      <p>{{ strings().splashClub }}</p>
    </section>
  `,
  styles: `
    .splash {
      min-height: 100dvh;
      display: grid;
      place-content: center;
      justify-items: center;
      background: var(--forest-dark);
      text-align: center;
      gap: 8px;
      padding: 24px;
    }
    h1 {
      margin: 8px 0 0;
      color: var(--cream);
      font-size: 32px;
    }
    p {
      margin: 0;
      color: color-mix(in srgb, var(--cream) 75%, transparent);
      font-size: 16px;
    }
  `,
})
export class SplashPage {
  readonly strings = input.required<Strings>();
  readonly finished = output<void>();

  constructor() {
    const id = setTimeout(() => this.finished.emit(), 1800);
    inject(DestroyRef).onDestroy(() => clearTimeout(id));
  }
}
