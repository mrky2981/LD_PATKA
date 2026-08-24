import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ClubService } from '../core/club';
import { InstallService } from '../core/install';
import { downloadMarkedMap } from '../core/map-export';
import { Stand, availableCount, isFeeding, isLargeFeeding, isSmallFeeding, isTaken, takenCount } from '../core/models';
import { LanguageButton } from '../ui/language-button';
import { AddStandDialog } from '../ui/add-stand-dialog';
import { StandSheet } from '../ui/stand-sheet';

const ZOOM_RANGE = 8;

interface PinView {
  stand: Stand;
  kind: 'hunting' | 'large' | 'small';
  taken: boolean;
}

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LanguageButton, AddStandDialog, StandSheet],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class MapPage {
  readonly club = inject(ClubService);
  readonly install = inject(InstallService);
  readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  readonly s = this.club.strings;
  readonly state = this.club.state;
  readonly placeType = signal<string | null>(null);
  readonly pending = signal<{ x: number; y: number } | null>(null);
  readonly selected = signal<Stand | null>(null);
  readonly highlightedId = signal<string | null>(null);
  readonly showFree = signal(true);
  readonly showTaken = signal(true);
  readonly showFeedLarge = signal(true);
  readonly showFeedSmall = signal(true);
  readonly legendOpen = signal(false);
  readonly size = signal({ w: 1, h: 1 });
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);
  private pointers = new Map<number, { x: number; y: number }>();
  private lastPinch = 0;
  private lastTap = 0;
  private moved = false;
  private fittedOnce = false;
  private liveScale = 1;
  private liveX = 0;
  private liveY = 0;
  private paintQueued = 0;

  readonly catalog = computed(() => this.state().catalog);
  readonly fitted = computed(() => {
    const catalog = this.catalog();
    if (!catalog) {
      const { w, h } = this.size();
      return { baseW: w, baseH: h };
    }
    return { baseW: catalog.map.width, baseH: catalog.map.height };
  });
  readonly pins = computed(() => {
    const catalog = this.catalog();
    if (!catalog) {
      return [];
    }
    const state = this.state();
    const highlight = this.highlightedId();
    return catalog.stands.filter((stand) => {
      if (stand.id === highlight) {
        return true;
      }
      const taken = isTaken(state, stand.id);
      if (isSmallFeeding(stand)) {
        return this.showFeedSmall();
      }
      if (isFeeding(stand)) {
        return this.showFeedLarge();
      }
      return taken ? this.showTaken() : this.showFree();
    });
  });
  readonly pinViews = computed((): PinView[] => {
    const state = this.state();
    return this.pins().map((stand) => ({
      stand,
      kind: isSmallFeeding(stand) ? 'small' : isFeeding(stand) ? 'large' : 'hunting',
      taken: isTaken(state, stand.id),
    }));
  });
  readonly freeCount = computed(() => availableCount(this.state()));
  readonly taken = computed(() => takenCount(this.state()));
  readonly feedingLargeCount = computed(
    () => this.state().catalog?.stands.filter(isLargeFeeding).length ?? 0,
  );
  readonly feedingSmallCount = computed(
    () => this.state().catalog?.stands.filter(isSmallFeeding).length ?? 0,
  );
  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => {
      if (this.paintQueued) {
        cancelAnimationFrame(this.paintQueued);
      }
    });
    afterNextRender(() => {
      this.measure();
      this.fitCover();
      const focus = this.club.focusStandId();
      if (focus) {
        const stand = this.catalog()?.stands.find((item) => item.id === focus);
        if (stand) {
          this.focus(stand);
        }
        this.club.focusStandId.set(null);
      }
      const observer = new ResizeObserver(() => {
        const prev = this.size();
        this.measure();
        if (!this.fittedOnce || prev.w < 20 || prev.h < 20) {
          this.fitCover();
          return;
        }
        this.setView(this.liveScale, { x: this.liveX, y: this.liveY });
      });
      observer.observe(this.viewport().nativeElement);
      destroy.onDestroy(() => observer.disconnect());
    });
  }

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.legend')) {
      return;
    }
    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.moved = false;
    if (this.pointers.size === 2) {
      this.lastPinch = this.pinchDistance();
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    const prev = this.pointers.get(event.pointerId)!;
    const next = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, next);
    if (this.pointers.size === 2) {
      this.setPanning(true);
      const dist = this.pinchDistance();
      if (this.lastPinch) {
        this.zoomAt(this.centroid(), dist / this.lastPinch);
      }
      this.lastPinch = dist;
      this.moved = true;
      return;
    }
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (this.moved || Math.abs(dx) + Math.abs(dy) > 4) {
      if (!this.moved) {
        this.viewport().nativeElement.setPointerCapture(event.pointerId);
      }
      this.moved = true;
      this.setPanning(true);
      this.setView(this.liveScale, { x: this.liveX + dx, y: this.liveY + dy });
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    this.pointers.delete(event.pointerId);
    this.lastPinch = 0;
    if (this.pointers.size === 0) {
      this.setPanning(false);
    }
    if (this.pointers.size === 0 && !this.moved) {
      const now = Date.now();
      if (now - this.lastTap < 280) {
        this.doubleTap(event);
        this.lastTap = 0;
        return;
      }
      this.lastTap = now;
      this.tap(event);
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomAt({ x: event.clientX, y: event.clientY }, factor);
  }

  tap(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.legend')) {
      return;
    }
    const stand = this.hitPin(event.clientX, event.clientY);
    if (this.placeType()) {
      const local = this.mapPoint(event.clientX, event.clientY);
      if (local) {
        this.pending.set(local);
      }
      return;
    }
    if (stand) {
      this.selected.set(stand);
    }
  }

  showStandOnMap(stand: Stand): void {
    this.selected.set(null);
    this.focus(stand);
  }

  saveStand(code: string): void {
    const pending = this.pending();
    const type = this.placeType();
    if (!pending || !type) {
      return;
    }
    this.club.addStand(type, code, pending.x, pending.y);
    this.pending.set(null);
    this.placeType.set(null);
  }

  async downloadMap(): Promise<void> {
    const catalog = this.catalog();
    if (!catalog || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exportError.set(null);
    const state = this.state();
    const strings = this.s();
    try {
      await downloadMarkedMap({
        imageSrc: 'map_loviste.jpg',
        stands: catalog.stands,
        takenIds: new Set(
          catalog.stands.filter((stand) => !isFeeding(stand) && isTaken(state, stand.id)).map((stand) => stand.id),
        ),
        filename: `LD-Patka-karta-${state.huntingDay}.png`,
        labels: {
          title: catalog.club.name,
          date: state.huntingDay,
          free: strings.legendFree,
          taken: strings.legendTaken,
          feedLarge: strings.legendFeedingLarge,
          feedSmall: strings.legendFeedingSmall,
        },
      });
    } catch {
      this.exportError.set(strings.downloadMapFailed);
    } finally {
      this.exporting.set(false);
    }
  }

  private hitPin(clientX: number, clientY: number): Stand | null {
    const pt = this.mapPoint(clientX, clientY);
    if (!pt) {
      return null;
    }
    const { baseW, baseH } = this.fitted();
    const zoom = this.liveScale;
    const views = this.pinViews();
    for (let i = views.length - 1; i >= 0; i--) {
      const pin = views[i];
      const dx = (pt.x - pin.stand.x) * baseW * zoom;
      const dy = (pt.y - pin.stand.y) * baseH * zoom;
      const half = pin.kind === 'small' ? 20 : pin.kind === 'large' ? 15 : 17;
      const height = pin.kind === 'small' ? 28 : pin.kind === 'large' ? 32 : 46;
      if (dx >= -half && dx <= half && dy >= -height && dy <= 6) {
        return pin.stand;
      }
    }
    return null;
  }

  private mapPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const { baseW, baseH } = this.fitted();
    const x = (clientX - rect.left - this.liveX) / (baseW * this.liveScale);
    const y = (clientY - rect.top - this.liveY) / (baseH * this.liveScale);
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }
    return { x, y };
  }

  private doubleTap(event: PointerEvent): void {
    const current = this.liveScale;
    const cover = this.minScale();
    const target = current > cover * 2.3 ? cover : Math.min(this.maxScale(), current * 2.4);
    this.zoomAt({ x: event.clientX, y: event.clientY }, target / current);
    if (target <= cover + 0.0005) {
      this.fitCover();
    }
  }

  private focus(stand: Stand): void {
    this.highlightedId.set(stand.id);
    const target = clamp(this.minScale() * 3.4, this.minScale(), this.maxScale());
    const { baseW, baseH } = this.fitted();
    const { w, h } = this.size();
    this.setView(target, {
      x: w / 2 - stand.x * baseW * target,
      y: h / 2 - stand.y * baseH * target,
    });
  }

  private zoomAt(screen: { x: number; y: number }, factor: number): void {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const local = { x: screen.x - rect.left, y: screen.y - rect.top };
    const oldScale = this.liveScale;
    const newScale = clamp(oldScale * factor, this.minScale(), this.maxScale());
    const z = newScale / oldScale;
    this.setView(newScale, {
      x: this.liveX * z + local.x * (1 - z),
      y: this.liveY * z + local.y * (1 - z),
    });
  }

  private pinchDistance(): number {
    const points = [...this.pointers.values()];
    if (points.length < 2) {
      return 0;
    }
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  private centroid(): { x: number; y: number } {
    const points = [...this.pointers.values()];
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  private measure(): void {
    const el = this.viewport().nativeElement;
    this.size.set({ w: el.clientWidth, h: el.clientHeight });
  }

  private coverScale(): number {
    const { baseW, baseH } = this.fitted();
    const { w, h } = this.size();
    return Math.max(w / Math.max(baseW, 1), h / Math.max(baseH, 1));
  }

  private minScale(): number {
    return this.coverScale();
  }

  private maxScale(): number {
    return Math.max(this.minScale() * 1.2, this.minScale() * ZOOM_RANGE);
  }

  private fitCover(): void {
    const scale = this.coverScale();
    const { baseW, baseH } = this.fitted();
    const { w, h } = this.size();
    this.setView(scale, {
      x: (w - baseW * scale) / 2,
      y: (h - baseH * scale) / 2,
    });
    this.fittedOnce = true;
  }

  private setPanning(active: boolean): void {
    this.viewport().nativeElement.classList.toggle('panning', active);
  }

  private setView(scale: number, pan: { x: number; y: number }): void {
    const next = this.clamp(pan, scale);
    this.liveScale = scale;
    this.liveX = next.x;
    this.liveY = next.y;
    this.queuePaint();
  }

  private queuePaint(): void {
    if (this.paintQueued) {
      return;
    }
    this.paintQueued = requestAnimationFrame(() => {
      this.paintQueued = 0;
      const el = this.stage().nativeElement;
      el.style.transform = `translate3d(${this.liveX}px, ${this.liveY}px, 0) scale(${this.liveScale})`;
      el.style.setProperty('--map-zoom', String(this.liveScale));
      el.style.setProperty('--pin-scale', String(1 / Math.max(this.liveScale, 0.0001)));
    });
  }

  private clamp(raw: { x: number; y: number }, atScale: number): { x: number; y: number } {
    const { baseW, baseH } = this.fitted();
    const { w, h } = this.size();
    const scaledW = baseW * atScale;
    const scaledH = baseH * atScale;
    const x = scaledW <= w + 0.5 ? (w - scaledW) / 2 : clamp(raw.x, w - scaledW, 0);
    const y = scaledH <= h + 0.5 ? (h - scaledH) / 2 : clamp(raw.y, h - scaledH, 0);
    return { x, y };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
