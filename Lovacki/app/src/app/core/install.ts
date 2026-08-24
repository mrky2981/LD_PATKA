import { Injectable, signal } from '@angular/core';
import { downloadText } from './file-download';

export type ShortcutKind = 'ios' | 'android' | 'desktop' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class InstallService {
  readonly dialog = signal<ShortcutKind | null>(null);
  private deferred: BeforeInstallPromptEvent | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.dialog.set('installed');
    });
  }

  dismiss(): void {
    this.dialog.set(null);
  }

  async addShortcut(): Promise<void> {
    if (isStandalone()) {
      this.dialog.set('installed');
      return;
    }
    if (this.deferred) {
      try {
        await this.deferred.prompt();
        const { outcome } = await this.deferred.userChoice;
        this.deferred = null;
        if (outcome === 'accepted') {
          this.dialog.set('installed');
        }
        return;
      } catch {
        this.deferred = null;
      }
    }
    if (isIos()) {
      this.dialog.set('ios');
      return;
    }
    if (isAndroid()) {
      this.dialog.set('android');
      return;
    }
    downloadDesktopShortcut();
    this.dialog.set('desktop');
  }
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function appUrl(): string {
  return new URL('map', document.baseURI).href;
}

function downloadDesktopShortcut(): void {
  const url = appUrl();
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/i.test(ua)) {
    downloadText(webloc(url), 'LD-Patka.webloc', 'application/xml');
    return;
  }
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    downloadText(desktopEntry(url), 'LD-Patka.desktop', 'application/x-desktop');
    return;
  }
  downloadText(`[InternetShortcut]\r\nURL=${url}\r\n`, 'LD-Patka.url', 'application/internet-shortcut');
}

function webloc(url: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${escapeXml(url)}</string>
</dict>
</plist>
`;
}

function desktopEntry(url: string): string {
  return `[Desktop Entry]
Version=1.0
Type=Link
Name=LD Patka
Comment=Lovačko društvo Patka
URL=${url}
Icon=text-html
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
