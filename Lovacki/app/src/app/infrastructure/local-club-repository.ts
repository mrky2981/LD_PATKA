import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClubSnapshot, Member, StandCatalog, memberDisplayName, normalizeLicense } from '../domain';
import { hashPassword, randomSalt } from '../core/crypto';
import { AuthSession, ClubRepository, Unsubscribe } from '../application/ports';

const STORE_KEY = 'ld-patka-club-state';

@Injectable({ providedIn: 'root' })
export class LocalClubRepository implements ClubRepository {
  private readonly http = inject(HttpClient);

  async loadCatalog(): Promise<StandCatalog> {
    return firstValueFrom(this.http.get<StandCatalog>('stands.json'));
  }

  async loadSnapshot(): Promise<ClubSnapshot> {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as ClubSnapshot) : {};
    } catch {
      return {};
    }
  }

  async saveSnapshot(snapshot: ClubSnapshot): Promise<void> {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
    } catch {
      // Private browsing / blocked storage must not crash the app.
    }
  }

  watchLive(onChange: Parameters<NonNullable<ClubRepository['watchLive']>>[0]): Unsubscribe {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORE_KEY || !event.newValue) {
        return;
      }
      try {
        const snap = JSON.parse(event.newValue) as ClubSnapshot;
        onChange({
          occupancies: snap.occupancies,
          sightings: snap.sightings,
          claimEvents: snap.claimEvents,
          duckSignups: snap.duckSignups,
          users: snap.users,
          customStands: snap.customStands,
          removedStandIds: snap.removedStandIds,
        });
      } catch {
        // Ignore a corrupt snapshot from another tab.
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalAuthSession implements AuthSession {
  async login(licenseNumber: string, password: string, members: Member[]): Promise<Member> {
    const key = normalizeLicense(licenseNumber);
    const user = members.find((account) => normalizeLicense(account.licenseNumber) === key);
    if (!user?.passwordHash || !user.passwordSalt) {
      throw new Error('bad-login');
    }
    if (user.passwordHash !== (await hashPassword(password, user.passwordSalt))) {
      throw new Error('bad-login');
    }
    return user;
  }

  async register(input: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    password: string;
    role: Member['role'];
    members: Member[];
  }): Promise<Member> {
    const license = input.licenseNumber.trim();
    if (
      input.members.some((user) => normalizeLicense(user.licenseNumber) === normalizeLicense(license))
    ) {
      throw new Error('license-taken');
    }
    const salt = randomSalt();
    return {
      id: crypto.randomUUID(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      displayName: memberDisplayName(input.firstName, input.lastName),
      licenseNumber: license,
      passwordSalt: salt,
      passwordHash: await hashPassword(input.password, salt),
      role: input.role,
      status: 'MEMBER',
    };
  }

  async logout(): Promise<void> {
    return;
  }
}
