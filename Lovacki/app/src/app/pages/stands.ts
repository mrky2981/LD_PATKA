import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClubFacade } from '../application/club-facade';
import { occupancyLabel, standDisplayName, feedingKindLabel, format } from '../core/l10n';
import {
  Stand,
  feedingKindColor,
  hasMapPosition,
  isFavoriteStand,
  isFeeding,
  isHunting,
  isTaken,
  isTakenByMe,
  isTouristOccupancy,
  occupancyFor,
  todaysDuckSignups,
} from '../core/models';
import { DuckHuntSheet } from '../ui/duck-hunt-sheet';
import { StandSheet } from '../ui/stand-sheet';

type Filter = 'all' | 'favorites' | 'available' | 'taken' | 'feeding';

@Component({
  selector: 'app-stands',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DuckHuntSheet, StandSheet],
  templateUrl: './stands.html',
  styleUrl: './stands.scss',
})
export class StandsPage {
  readonly club = inject(ClubFacade);
  private readonly router = inject(Router);
  readonly s = this.club.strings;
  readonly state = this.club.state;
  readonly filter = signal<Filter>('all');
  readonly query = signal('');
  readonly selected = signal<Stand | null>(null);
  readonly duckOpen = signal(false);
  readonly duckCount = computed(() => todaysDuckSignups(this.state()).length);
  readonly format = format;
  readonly standDisplayName = standDisplayName;

  readonly filters = computed(() => {
    const s = this.s();
    return [
      { id: 'all' as const, label: s.filterAll },
      { id: 'favorites' as const, label: s.filterFavorites },
      { id: 'available' as const, label: s.filterAvailable },
      { id: 'taken' as const, label: s.filterTaken },
      { id: 'feeding' as const, label: s.filterFeeding },
    ];
  });

  readonly stands = computed(() => {
    const state = this.state();
    const all = state.catalog?.stands ?? [];
    const filter = this.filter();
    const byFilter = all.filter((stand) => {
      if (filter === 'favorites') {
        return isHunting(stand) && isFavoriteStand(state.currentUser, stand.id);
      }
      if (filter === 'available') {
        return isHunting(stand) && !isTaken(state, stand.id);
      }
      if (filter === 'taken') {
        return isHunting(stand) && isTaken(state, stand.id);
      }
      if (filter === 'feeding') {
        return isFeeding(stand);
      }
      return true;
    });
    const q = this.query().trim().toLowerCase();
    const matched = q
      ? byFilter.filter(
          (stand) =>
            stand.code.toLowerCase().includes(q) ||
            stand.name.toLowerCase().includes(q) ||
            standDisplayName(this.s(), stand.code, stand.type, stand.feedingKind).toLowerCase().includes(q),
        )
      : byFilter;
    const favorites = matched.filter((stand) => isFavoriteStand(state.currentUser, stand.id));
    if (filter === 'favorites' || favorites.length === 0) {
      return matched;
    }
    const rest = matched.filter((stand) => !isFavoriteStand(state.currentUser, stand.id));
    return [...favorites, ...rest];
  });

  readonly emptyMessage = computed(() => {
    if (this.filter() === 'favorites' && !this.query().trim()) {
      return this.s().favoritesEmpty;
    }
    return this.s().noSearchResults;
  });

  setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  canFavorite(stand: Stand): boolean {
    return isHunting(stand);
  }

  isFavorite(stand: Stand): boolean {
    return isFavoriteStand(this.state().currentUser, stand.id);
  }

  toggleFavorite(stand: Stand): void {
    this.club.toggleFavoriteStand(stand.id);
  }

  color(stand: Stand): string {
    if (isFeeding(stand)) {
      return feedingKindColor(stand.feedingKind);
    }
    return occupancyFor(this.state(), stand.id) ? 'var(--taken)' : 'var(--available)';
  }

  subtitle(stand: Stand): string {
    if (isFeeding(stand)) {
      return feedingKindLabel(this.s(), stand.feedingKind);
    }
    const occ = occupancyFor(this.state(), stand.id);
    if (occ) {
      return occupancyLabel(this.s(), occ, isTouristOccupancy(occ), isTakenByMe(this.state(), stand.id));
    }
    return this.s().available;
  }

  showOnMap(stand: Stand): void {
    if (!hasMapPosition(stand)) {
      return;
    }
    this.club.focusStandId.set(stand.id);
    this.selected.set(null);
    void this.router.navigateByUrl('/map');
  }
}
