import { ChangeDetectionStrategy, Component, DestroyRef, inject, isDevMode, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { ClubService } from './core/club';
import { SplashPage } from './pages/splash';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SplashPage],
  template: `
    @if (!club.splashDone()) {
      <app-splash [strings]="club.strings()" (finished)="club.finishSplash()" />
    } @else {
      <router-outlet />
    }
    @if (updateReady()) {
      <button class="update" type="button" (click)="reload()">Ažuriranje je spremno · Update ready</button>
    }
  `,
  styles: `
    .update {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(72px + env(safe-area-inset-bottom));
      z-index: 60;
      background: var(--moss);
      color: var(--cream);
      border: 0;
      border-radius: 12px;
      padding: 12px;
      font: inherit;
      cursor: pointer;
    }
    @media (min-width: 900px) {
      .update {
        left: auto;
        right: 24px;
        bottom: 24px;
        width: max-content;
      }
    }
  `,
})
export class App {
  readonly club = inject(ClubService);
  readonly updateReady = signal(false);

  constructor() {
    const updates = inject(SwUpdate);
    if (!isDevMode() && updates.isEnabled) {
      updates.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.updateReady.set(true);
        }
      });
    }
    const timer = setInterval(() => this.club.refreshHuntingDay(), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  reload(): void {
    location.reload();
  }
}
