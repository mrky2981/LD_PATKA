import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ClubService } from '../core/club';
import { animals, occupancyLabel, standDisplayName } from '../core/l10n';
import {
  Stand,
  canBookForGuests,
  canRelease,
  isFeeding,
  isHunting,
  isTakenByMe,
  isTouristOccupancy,
  occupancyFor,
} from '../core/models';

@Component({
  selector: 'app-stand-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stand-sheet.html',
  styleUrl: './stand-sheet.scss',
})
export class StandSheet {
  readonly club = inject(ClubService);
  readonly stand = input.required<Stand>();
  readonly closed = output<void>();
  readonly showOnMap = output<void>();

  readonly standDisplayName = standDisplayName;
  readonly s = this.club.strings;
  readonly state = this.club.state;
  readonly animalList = computed(() => animals(this.s()));
  readonly selectedAnimal = signal(this.animalList()[0]);
  readonly count = signal(1);
  readonly note = signal('');
  readonly logged = signal(false);

  readonly occ = computed(() => occupancyFor(this.state(), this.stand().id));
  readonly mine = computed(() => isTakenByMe(this.state(), this.stand().id));
  readonly statusText = computed(() => {
    const stand = this.stand();
    const occ = this.occ();
    if (isFeeding(stand)) {
      return stand.feedingKind === 'small' ? this.s().feedingSmall : this.s().feedingLarge;
    }
    if (occ) {
      return occupancyLabel(this.s(), occ, isTouristOccupancy(occ), this.mine());
    }
    return this.s().available;
  });
  readonly statusClass = computed(() => {
    if (isFeeding(this.stand())) {
      return this.stand().feedingKind === 'small' ? 'feeding-small' : 'feeding';
    }
    return this.occ() ? 'taken' : 'free';
  });
  readonly canTake = computed(() => isHunting(this.stand()) && !this.occ());
  readonly canLeave = computed(() => this.mine());
  readonly canLeaveTourist = computed(
    () => Boolean(this.occ()) && !this.mine() && canRelease(this.state(), this.stand().id),
  );
  readonly canTourist = computed(() => this.canTake() && canBookForGuests(this.state()));

  setCount(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.count.set(Math.min(99, Math.max(1, Number(value) || 1)));
  }

  setNote(event: Event): void {
    this.note.set((event.target as HTMLInputElement).value);
  }

  saveNote(): void {
    this.club.addSighting(this.stand().id, this.selectedAnimal(), this.count(), this.note());
    this.logged.set(true);
    this.note.set('');
    this.count.set(1);
  }

  take(): void {
    this.club.takeStand(this.stand().id);
  }

  leave(): void {
    this.club.leaveStand(this.stand().id);
  }

  tourist(): void {
    this.club.takeStandForTourist(this.stand().id);
  }

  removeStand(): void {
    this.club.deleteStand(this.stand().id);
    this.closed.emit();
  }
}
