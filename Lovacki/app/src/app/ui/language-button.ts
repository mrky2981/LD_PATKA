import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppLang } from '../core/models';

@Component({
  selector: 'app-language-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang" role="group" [attr.aria-label]="'Language'">
      <button type="button" [class.active]="language() === 'en'" (click)="changed.emit('en')">
        ENG
      </button>
      <span aria-hidden="true">|</span>
      <button type="button" [class.active]="language() === 'hr'" (click)="changed.emit('hr')">
        HRV
      </button>
    </div>
  `,
  styles: `
    .lang {
      display: flex;
      align-items: center;
      gap: 2px;
      border: 1px solid color-mix(in srgb, var(--cream) 35%, transparent);
      border-radius: 20px;
      padding: 0 4px;
    }
    button {
      background: none;
      border: 0;
      color: color-mix(in srgb, var(--cream) 45%, transparent);
      font: inherit;
      font-size: 13px;
      padding: 8px 10px;
      cursor: pointer;
    }
    button.active {
      color: var(--cream);
      font-weight: 700;
    }
    span {
      color: var(--moss);
      font-size: 13px;
    }
  `,
})
export class LanguageButton {
  readonly language = input.required<AppLang>();
  readonly changed = output<AppLang>();
}
