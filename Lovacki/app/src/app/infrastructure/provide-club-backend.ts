/** Wires Identity + HuntingGround + Occupancy repositories. Firebase modular SDK (the same APIs AngularFire wraps). */
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AUTH_SESSION, CLUB_REPOSITORY } from '../application/tokens';
import { LocalAuthSession, LocalClubRepository } from './local-club-repository';
import { FirebaseAuthSession, FirebaseClubRepository } from './firebase/firebase-club-repository';
import { environment } from '../../environments/environment';

export function provideClubBackend(): EnvironmentProviders {
  if (environment.useFirebase) {
    return makeEnvironmentProviders([
      { provide: CLUB_REPOSITORY, useExisting: FirebaseClubRepository },
      { provide: AUTH_SESSION, useExisting: FirebaseAuthSession },
    ]);
  }
  return makeEnvironmentProviders([
    { provide: CLUB_REPOSITORY, useExisting: LocalClubRepository },
    { provide: AUTH_SESSION, useExisting: LocalAuthSession },
  ]);
}
