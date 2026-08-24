import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ClubService } from '../core/club';
import { formatZagreb } from '../core/hunting-day';
import { animalLabel, standDisplayName } from '../core/l10n';
import { mySightings } from '../core/models';

@Component({
  selector: 'app-sightings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>{{ s().sightings }}</h1>
      <p class="sub">{{ s().notesPrivate }}</p>
      @if (notes().length === 0) {
        <p>{{ s().noSightings }}</p>
      } @else {
        <ul>
          @for (note of notes(); track note.id) {
            <li>
              <div>
                <strong>{{ note.count }}× {{ animalLabel(s(), note.animalId) }}</strong>
                <small>{{ standName(note.standId) }} · {{ formatZagreb(note.atEpochMs) }}</small>
                @if (note.note) {
                  <span>{{ note.note }}</span>
                }
              </div>
              <button type="button" (click)="club.deleteSighting(note.id)" [attr.aria-label]="s().delete">
                {{ s().delete }}
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .page { padding: 12px 16px 24px; color: var(--cream); }
    @media (min-width: 900px) { .page { padding: 24px 28px 40px; } }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .sub, p { color: color-mix(in srgb, var(--cream) 65%, transparent); font-size: 13px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li {
      background: var(--forest);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    li div { display: grid; gap: 4px; flex: 1; }
    small { color: color-mix(in srgb, var(--cream) 70%, transparent); }
    button {
      background: none;
      border: 0;
      color: color-mix(in srgb, var(--cream) 70%, transparent);
      cursor: pointer;
      font: inherit;
    }
  `,
})
export class SightingsPage {
  readonly club = inject(ClubService);
  readonly s = this.club.strings;
  readonly animalLabel = animalLabel;
  readonly formatZagreb = formatZagreb;
  readonly notes = computed(() => mySightings(this.club.state()));

  standName(standId: string): string {
    const stand = this.club.state().catalog?.stands.find((item) => item.id === standId);
    return stand ? standDisplayName(this.s(), stand.code, stand.type, stand.feedingKind) : standId;
  }
}
