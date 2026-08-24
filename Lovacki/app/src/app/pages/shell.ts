import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ClubService } from '../core/club';
import { InstallService } from '../core/install';
import { ShortcutDialog } from '../ui/shortcut-dialog';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ShortcutDialog],
  template: `
    <div class="shell">
      <nav [attr.aria-label]="s().appName">
        <a routerLink="/map" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3 13 5.5 7 3 3.5 4.5v16.1L10 18.5 16 21l4.5-1.6V3ZM10 16.8 5.5 18V6.2L10 4.6Zm8.5 1.2L16 19.4V7.2l2.5-1.2Z"/></svg>
          <span>{{ s().map }}</span>
        </a>
        <a routerLink="/stands" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
          <span>{{ s().stands }}</span>
        </a>
        <a routerLink="/history" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3l4 3-4 3V7a5 5 0 1 0 5 5h2A7 7 0 0 1 13 3Z"/></svg>
          <span>{{ s().history }}</span>
        </a>
        <a routerLink="/sightings" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 4h14v16H5zm2 2v12h10V6zm2 2h6v2H9zm0 4h6v2H9z"/></svg>
          <span>{{ s().sightings }}</span>
        </a>
        <a routerLink="/club" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4 6v6c0 5 3.4 9.4 8 10.7C16.6 21.4 20 17 20 12V6Zm0 4 6 3v5c0 3.4-2.2 6.5-6 7.6-3.8-1.1-6-4.2-6-7.6V9Z"/></svg>
          <span>{{ s().club }}</span>
        </a>
      </nav>
      <main>
        <router-outlet />
      </main>
    </div>
    @if (install.dialog(); as kind) {
      <app-shortcut-dialog [kind]="kind" [strings]="s()" (closed)="install.dismiss()" />
    }
  `,
  styles: `
    .shell {
      height: 100dvh;
      display: grid;
      grid-template: 'content' 1fr 'nav' auto / 1fr;
      background: var(--forest-dark);
    }
    main {
      grid-area: content;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    main:has(app-map) {
      overflow: hidden;
      display: grid;
      grid-template-rows: 1fr;
    }
    router-outlet {
      display: none;
    }
    nav {
      grid-area: nav;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      background: var(--forest);
      padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
    }
    a {
      color: var(--muted);
      text-decoration: none;
      display: grid;
      justify-items: center;
      gap: 2px;
      font-size: 11px;
      min-height: 48px;
      padding: 6px 0;
      border-radius: 12px;
      align-content: center;
    }
    a.active {
      color: var(--cream);
      background: var(--moss);
    }
    svg {
      width: 22px;
      height: 22px;
    }
    @media (min-width: 900px) {
      .shell {
        grid-template: 'nav content' 1fr / 220px 1fr;
      }
      nav {
        grid-auto-rows: min-content;
        grid-template-columns: 1fr;
        align-content: start;
        gap: 6px;
        padding: 20px 12px;
      }
      a {
        grid-template-columns: 24px 1fr;
        justify-items: start;
        align-items: center;
        column-gap: 10px;
        font-size: 14px;
        min-height: 44px;
        padding: 10px 12px;
      }
    }
  `,
})
export class ShellPage {
  readonly club = inject(ClubService);
  readonly install = inject(InstallService);
  readonly s = this.club.strings;
}
