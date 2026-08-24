import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ClubService } from '../core/club';
import { format } from '../core/l10n';
import { DuckSignup, canBookForGuests, canRemoveDuckSignup, isSignedUpForDucks, isTouristSignup, todaysDuckSignups } from '../core/models';

@Component({
  selector: 'app-duck-hunt-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <section class="sheet" role="dialog" aria-modal="true" [attr.aria-labelledby]="'duck-title'">
      <h2 id="duck-title">{{ s().duckHunt }}</h2>
      <p>{{ s().duckHuntBody }}</p>
      @if (signedUp()) {
        <button class="outline" type="button" (click)="club.leaveDuckHunt()">{{ s().duckHuntLeave }}</button>
      } @else {
        <button class="available" type="button" (click)="club.joinDuckHunt()">{{ s().duckHuntJoin }}</button>
      }
      @if (guests()) {
        <button class="outline" type="button" (click)="club.addDuckTourist()">{{ s().takeForTourist }}</button>
      }
      <p class="count">{{ format(s().duckHuntCount, signups().length) }}</p>
      @if (signups().length === 0) {
        <p class="muted">{{ s().duckHuntEmpty }}</p>
      } @else {
        @for (signup of signups(); track signup.id) {
          <div class="row">
            <span>
              {{
                signup.forTourist
                  ? format(s().duckHuntTourist, signup.bookedByName || '—')
                  : signup.hunterName
              }}
            </span>
            @if (canRemove(signup) && isTouristSignup(signup)) {
              <button class="delete" type="button" (click)="club.removeDuckSignup(signup.id)">
                {{ s().delete }}
              </button>
            }
          </div>
        }
      }
    </section>
  `,
  styleUrl: './stand-sheet.scss',
})
export class DuckHuntSheet {
  readonly club = inject(ClubService);
  readonly closed = output<void>();
  readonly s = this.club.strings;
  readonly format = format;
  readonly isTouristSignup = isTouristSignup;
  readonly signedUp = computed(() => isSignedUpForDucks(this.club.state()));
  readonly guests = computed(() => canBookForGuests(this.club.state()));
  readonly signups = computed(() => todaysDuckSignups(this.club.state()));

  canRemove(signup: DuckSignup): boolean {
    return canRemoveDuckSignup(this.club.state(), signup);
  }
}
