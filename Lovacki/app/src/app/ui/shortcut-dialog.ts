import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ShortcutKind } from '../core/install';
import { Strings } from '../core/l10n';

@Component({
  selector: 'app-shortcut-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
      <h2 id="shortcut-title">{{ strings().shortcutTitle }}</h2>
      <p>
        @switch (kind()) {
          @case ('ios') {
            {{ strings().shortcutIosBody }}
          }
          @case ('android') {
            {{ strings().shortcutAndroidBody }}
          }
          @case ('desktop') {
            {{ strings().shortcutDesktopBody }}
          }
          @case ('installed') {
            {{ strings().shortcutInstalled }}
          }
        }
      </p>
      <button class="primary" type="button" (click)="closed.emit()">{{ strings().shortcutOk }}</button>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(0 0 0 / 45%);
    }
    .dialog {
      position: relative;
      background: var(--forest);
      color: var(--cream);
      border-radius: 16px;
      padding: 20px;
      width: min(92vw, 380px);
      display: grid;
      gap: 12px;
    }
    h2 {
      margin: 0;
      font-size: 18px;
    }
    p {
      margin: 0;
      color: color-mix(in srgb, var(--cream) 80%, transparent);
      line-height: 1.45;
    }
    button {
      font: inherit;
      cursor: pointer;
      border-radius: 10px;
      padding: 10px 14px;
      justify-self: end;
    }
    .primary {
      background: var(--moss);
      color: var(--cream);
      border: 0;
    }
  `,
})
export class ShortcutDialog {
  readonly strings = input.required<Strings>();
  readonly kind = input.required<ShortcutKind>();
  readonly closed = output<void>();
}
