import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClubService } from './club';

export const authGuard: CanActivateFn = () => {
  const club = inject(ClubService);
  const router = inject(Router);
  return club.isLoggedIn() ? true : router.createUrlTree(['/auth']);
};

export const guestGuard: CanActivateFn = () => {
  const club = inject(ClubService);
  const router = inject(Router);
  return club.isLoggedIn() ? router.createUrlTree(['/map']) : true;
};
