import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClubFacade } from '../application/club-facade';
import { InstallService } from '../core/install';
import { format, statusLabel } from '../core/l10n';
import { Member, isAdmin, isKeeper } from '../core/models';
import { LanguageButton } from '../ui/language-button';

@Component({
  selector: 'app-club',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LanguageButton],
  templateUrl: './club.html',
  styleUrl: './club.scss',
})
export class ClubPage {
  readonly club = inject(ClubFacade);
  readonly install = inject(InstallService);
  private readonly router = inject(Router);
  readonly s = this.club.strings;
  readonly state = this.club.state;
  readonly format = format;
  readonly statusLabel = (user: Member) =>
    statusLabel(this.s(), isAdmin(user), isKeeper(user));
  readonly isAdmin = isAdmin;
  readonly isKeeper = isKeeper;
  readonly members = computed(() =>
    [...this.state().users].sort((a, b) => a.displayName.localeCompare(b.displayName)),
  );

  logout(): void {
    this.club.logout();
    void this.router.navigateByUrl('/auth');
  }
}
