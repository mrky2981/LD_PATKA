import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Strings } from '../core/l10n';

@Component({
  selector: 'app-add-stand-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <section class="dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="'new-stand'">
      <h2 id="new-stand">{{ strings().newStandTitle }}</h2>
      <label>
        <span>{{ strings().standCode }}</span>
        <input [value]="code()" (input)="onInput($event)" />
      </label>
      <div class="actions">
        <button class="ghost" type="button" (click)="closed.emit()">{{ strings().cancelPlace }}</button>
        <button class="primary" type="button" [disabled]="!code().trim()" (click)="saved.emit(code().trim())">
          {{ strings().saveStand }}
        </button>
      </div>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
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
      width: min(92vw, 360px);
      display: grid;
      gap: 12px;
    }
    h2 {
      margin: 0;
    }
    label,
    input {
      display: grid;
      width: 100%;
    }
    input {
      margin-top: 8px;
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--cream) 40%, transparent);
      border-radius: 10px;
      color: var(--cream);
      padding: 12px;
      font: inherit;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      font: inherit;
      cursor: pointer;
      border-radius: 10px;
      padding: 10px 14px;
    }
    .ghost {
      background: transparent;
      border: 0;
      color: var(--cream);
    }
    .primary {
      background: var(--moss);
      color: var(--cream);
      border: 0;
    }
    .primary:disabled {
      opacity: 0.5;
    }
  `,
})
export class AddStandDialog {
  readonly strings = input.required<Strings>();
  readonly closed = output<void>();
  readonly saved = output<string>();
  readonly code = signal('');

  onInput(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
  }
}
