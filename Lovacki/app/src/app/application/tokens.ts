import { InjectionToken } from '@angular/core';
import { AuthSession, ClubRepository } from './ports';

export const CLUB_REPOSITORY = new InjectionToken<ClubRepository>('CLUB_REPOSITORY');
export const AUTH_SESSION = new InjectionToken<AuthSession>('AUTH_SESSION');
