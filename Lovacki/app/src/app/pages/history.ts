import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ClubService } from '../core/club';
import { formatZagreb } from '../core/hunting-day';
import { format } from '../core/l10n';

@Component({
  selector: 'app-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>{{ s().history }}</h1>
      @if (events().length === 0) {
        <p>{{ s().historyEmpty }}</p>
      } @else {
        <ul>
          @for (event of events(); track event.id) {
            <li [class.gold]="event.type === 'change' || event.type === 'tourist'" [class.leave]="event.type === 'leave' || event.type === 'tourist-leave'">
              <strong>{{ title(event) }}</strong>
              <small>{{ formatZagreb(event.atEpochMs) }}</small>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .page { padding: 12px 16px 24px; color: var(--cream); }
    @media (min-width: 900px) { .page { padding: 24px 28px 40px; } }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { color: color-mix(in srgb, var(--cream) 70%, transparent); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li {
      background: var(--forest);
      border-radius: 14px;
      padding: 14px;
      display: grid;
      gap: 4px;
    }
    small { color: color-mix(in srgb, var(--cream) 70%, transparent); font-size: 13px; }
    .gold small { color: var(--feeding); }
    .leave small { color: var(--muted); }
  `,
})
export class HistoryPage {
  readonly club = inject(ClubService);
  readonly s = this.club.strings;
  readonly formatZagreb = formatZagreb;
  readonly events = computed(() => this.club.state().claimEvents);

  title(event: {
    type: string;
    hunterName: string;
    fromStandCode?: string | null;
    toStandCode: string;
  }): string {
    const s = this.s();
    if (event.type === 'duck') {
      return format(s.historyDuck, event.hunterName);
    }
    if (event.type === 'duck-leave') {
      return format(s.historyDuckLeave, event.hunterName);
    }
    if (event.type === 'duck-tourist') {
      return format(s.historyDuckTourist, event.hunterName);
    }
    if (event.type === 'tourist') {
      return format(s.historyTourist, event.hunterName, event.toStandCode);
    }
    if (event.type === 'leave') {
      return format(s.historyLeave, event.hunterName, event.toStandCode);
    }
    if (event.type === 'tourist-leave') {
      return format(s.historyTouristLeave, event.hunterName, event.toStandCode);
    }
    if (event.type === 'change') {
      return format(s.historyChange, event.hunterName, event.fromStandCode ?? '', event.toStandCode);
    }
    return format(s.historyClaim, event.hunterName, event.toStandCode);
  }
}
