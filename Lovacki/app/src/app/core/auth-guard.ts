import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClubFacade } from '../application/club-facade';

export const authGuard: CanActivateFn = () => {
  const club = inject(ClubFacade);
  const router = inject(Router);
  return club.isLoggedIn() ? true : router.createUrlTree(['/auth']);
};

export const guestGuard: CanActivateFn = () => {
  const club = inject(ClubFacade);
  const router = inject(Router);
  return club.isLoggedIn() ? router.createUrlTree(['/map']) : true;
};
