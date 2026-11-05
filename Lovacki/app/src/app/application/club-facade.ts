import { Injectable, computed, inject, signal } from '@angular/core';
import { hashPassword, newId } from '../core/crypto';
import { currentHuntingDay, nextResetLabel } from '../core/hunting-day';
import { stringsFor } from '../core/l10n';
import {
  ADMIN_INVITE_CODE,
  Animal,
  AppLang,
  ClaimEvent,
  ClubSnapshot,
  ClubState,
  DuckSignup,
  HunterStatus,
  Member,
  Occupancy,
  PlaceType,
  Sighting,
  Stand,
  StandCatalog,
  canBookForGuests,
  feedingKindFromPlace,
  isAdmin,
  isHunting,
  isSignedUpForDucks,
  isTaken,
  isTakenByMe,
  memberDisplayName,
  mergeCatalog,
  mergeRemoteStands,
  occupancyKey,
  ownHuntingStandIds,
  sameHunter,
  todaysDuckSignups,
} from '../domain';
import { AUTH_SESSION, CLUB_REPOSITORY } from './tokens';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClubFacade {
  private readonly repository = inject(CLUB_REPOSITORY);
  private readonly auth = inject(AUTH_SESSION);
  private baseCatalog: StandCatalog | null = null;
  private fileStands: Stand[] = [];
  private readonly store = signal<ClubState>(emptyState());
  private stopWatch: (() => void) | null = null;
  private pendingOccupancyDeletes: string[] = [];
  private pendingSightingDeletes: string[] = [];
  private pendingDuckDeletes: string[] = [];
  private pendingOccupancyUpserts: Occupancy[] = [];
  private pendingSightingUpserts: Sighting[] = [];
  private pendingClaimUpserts: ClaimEvent[] = [];
  private pendingDuckUpserts: DuckSignup[] = [];

  readonly state = this.store.asReadonly();
  readonly strings = computed(() => stringsFor(this.store().language));
  readonly isLoggedIn = computed(() => this.store().currentUser !== null);
  readonly isAdmin = computed(() => isAdmin(this.store().currentUser));
  readonly splashDone = computed(() => this.store().splashDone);
  readonly focusStandId = signal<string | null>(null);

  async init(): Promise<void> {
    try {
      this.baseCatalog = await this.repository.loadCatalog();
      this.fileStands = this.baseCatalog.stands;
      const saved = await this.repository.loadSnapshot();
      let users = this.hydrateMembers(saved.users ?? []);
      if (users.length === 0 && !environment.useFirebase) {
        users = [await seedLocalAdmin()];
      }
      const current = users.find((user) => user.id === saved.currentUserId) ?? null;
      const custom = saved.customStands ?? [];
      const removed = saved.removedStandIds ?? [];
      this.store.set({
        hunterName: current?.displayName ?? '',
        catalog: mergeCatalog(this.baseCatalog, custom, removed),
        occupancies: occupanciesByStand(saved.occupancies ?? [], currentHuntingDay()),
        sightings: newest(saved.sightings ?? []),
        huntingDay: currentHuntingDay(),
        nextResetLabel: nextResetLabel(),
        language: saved.language === 'hr' ? 'hr' : 'en',
        currentUser: current,
        users,
        customStands: custom,
        removedStandIds: removed,
        claimEvents: newest(saved.claimEvents ?? []),
        duckSignups: newest(saved.duckSignups ?? []),
        authError: null,
        splashDone: false,
      });
      document.documentElement.lang = saved.language === 'hr' ? 'hr' : 'en';
      this.attachWatch();
    } catch (error) {
      console.error(error);
      this.store.set({
        ...emptyState(),
        splashDone: true,
        authError: 'Aplikacija se nije mogla učitati. Osvježi stranicu.',
      });
    }
  }

  finishSplash(): void {
    this.store.update((state) => ({ ...state, splashDone: true }));
  }

  setLanguage(lang: AppLang): void {
    document.documentElement.lang = lang;
    this.commit((state) => ({ ...state, language: lang, authError: null }));
  }

  async login(licenseNumber: string, password: string): Promise<boolean> {
    try {
      const user = await this.auth.login(licenseNumber, password, this.store().users);
      this.adopt(user);
      await this.persist();
      this.attachWatch();
      return true;
    } catch {
      this.store.update((current) => ({
        ...current,
        authError: stringsFor(current.language).errorBadLogin,
      }));
      return false;
    }
  }

  async register(
    firstName: string,
    lastName: string,
    licenseNumber: string,
    password: string,
    confirm: string,
    adminCode: string,
  ): Promise<boolean> {
    const s = this.strings();
    const license = licenseNumber.trim();
    if (!firstName.trim() || !lastName.trim() || !password) {
      return this.fail(s.errorBlank);
    }
    if (!license) {
      return this.fail(s.errorLicenseBlank);
    }
    if (license.length < 3) {
      return this.fail(s.errorLicenseShort);
    }
    if (password.length < 6) {
      return this.fail(s.errorShortPassword);
    }
    if (password !== confirm) {
      return this.fail(s.errorPasswordMatch);
    }
    const wantsAdmin = adminCode.trim().length > 0;
    if (wantsAdmin && adminCode.trim() !== ADMIN_INVITE_CODE) {
      return this.fail(s.errorBadAdminCode);
    }
    try {
      const user = await this.auth.register({
        firstName,
        lastName,
        licenseNumber: license,
        password,
        role: wantsAdmin ? 'ADMIN' : 'MEMBER',
        members: this.store().users,
      });
      this.adopt(user);
      await this.persist();
      this.attachWatch();
      return true;
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'license-taken') {
        return this.fail(s.errorLicenseTaken);
      }
      return this.fail(s.errorBadLogin);
    }
  }

  async logout(): Promise<void> {
    this.stopWatch?.();
    this.stopWatch = null;
    await this.auth.logout();
    this.store.update((state) => ({
      ...state,
      currentUser: null,
      hunterName: '',
      authError: null,
    }));
    await this.persist();
  }

  takeStand(standId: string): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user) {
      return;
    }
    if (isTaken(current, standId) && !isTakenByMe(current, standId)) {
      return;
    }
    const mine = ownHuntingStandIds(current);
    if (mine.length === 1 && mine[0] === standId) {
      return;
    }
    const fromId = mine[0];
    const fromStand = fromId
      ? current.catalog?.stands.find((stand) => stand.id === fromId)
      : undefined;
    const toStand = current.catalog?.stands.find((stand) => stand.id === standId);
    if (!toStand || !isHunting(toStand)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    const event: ClaimEvent = {
      id: newId(),
      type: fromStand ? 'change' : 'claim',
      hunterUserId: user.id,
      hunterName: user.displayName,
      fromStandId: fromStand?.id ?? null,
      fromStandCode: fromStand?.code ?? null,
      toStandId: toStand.id,
      toStandCode: toStand.code,
      huntingDay: day,
      atEpochMs: now,
    };
    const next = { ...current.occupancies };
    for (const id of mine) {
      const previous = next[id];
      if (previous) {
        this.pendingOccupancyDeletes.push(occupancyKey(previous));
      }
      delete next[id];
    }
    next[standId] = {
      standId,
      hunterName: user.displayName,
      huntingDay: day,
      takenAtEpochMs: now,
      hunterUserId: user.id,
    };
    this.pendingOccupancyUpserts.push(next[standId]);
    this.publish(next, event, day);
  }

  takeStandForTourist(standId: string): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user || !canBookForGuests(current) || isTaken(current, standId)) {
      return;
    }
    const toStand = current.catalog?.stands.find((stand) => stand.id === standId);
    if (!toStand || !isHunting(toStand)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    const label = this.strings().takeForTourist;
    const event: ClaimEvent = {
      id: newId(),
      type: 'tourist',
      hunterUserId: user.id,
      hunterName: user.displayName,
      toStandId: toStand.id,
      toStandCode: toStand.code,
      huntingDay: day,
      atEpochMs: now,
    };
    const occupancy: Occupancy = {
      standId,
      hunterName: label,
      huntingDay: day,
      takenAtEpochMs: now,
      hunterUserId: '',
      forTourist: true,
      touristName: '',
      bookedByUserId: user.id,
      bookedByName: user.displayName,
    };
    this.pendingOccupancyUpserts.push(occupancy);
    this.publish({ ...current.occupancies, [standId]: occupancy }, event, day);
  }

  setHunterStatus(userId: string, status: HunterStatus): void {
    if (!this.isAdmin()) {
      return;
    }
    const users = this.store().users.map((account) =>
      account.id === userId ? { ...account, status } : account,
    );
    const current = users.find((account) => account.id === this.store().currentUser?.id) ?? null;
    this.commit((state) => ({
      ...state,
      users,
      currentUser: current,
      hunterName: current?.displayName ?? state.hunterName,
    }));
  }

  leaveStand(standId: string): void {
    const current = this.store();
    if (!current.currentUser) {
      return;
    }
    const occ = current.occupancies[standId];
    if (!occ) {
      return;
    }
    const mine = isTakenByMe(current, standId);
    const touristMine =
      Boolean(occ.forTourist) &&
      (occ.bookedByUserId === current.currentUser.id || isAdmin(current.currentUser));
    if (!mine && !touristMine) {
      return;
    }
    const stand = current.catalog?.stands.find((item) => item.id === standId);
    const now = Date.now();
    const day = currentHuntingDay();
    const event: ClaimEvent = {
      id: newId(),
      type: occ.forTourist ? 'tourist-leave' : 'leave',
      hunterUserId: current.currentUser.id,
      hunterName: current.currentUser.displayName,
      fromStandId: stand?.id ?? standId,
      fromStandCode: stand?.code ?? occ.standId,
      toStandId: stand?.id ?? standId,
      toStandCode: stand?.code ?? occ.standId,
      huntingDay: day,
      atEpochMs: now,
    };
    this.pendingOccupancyDeletes.push(occupancyKey(occ));
    const next = { ...current.occupancies };
    delete next[standId];
    this.publish(next, event);
  }

  addSighting(standId: string, animal: Animal, count: number, note: string): void {
    const user = this.store().currentUser;
    if (!user) {
      return;
    }
    const sighting: Sighting = {
      id: newId(),
      standId,
      hunterName: user.displayName,
      animalId: animal.id,
      animalLabel: animal.label,
      count: Math.max(1, count),
      note: note.trim(),
      atEpochMs: Date.now(),
      hunterUserId: user.id,
    };
    this.pendingSightingUpserts.push(sighting);
    this.commit((state) => ({ ...state, sightings: [sighting, ...state.sightings] }));
  }

  deleteSighting(id: string): void {
    const user = this.store().currentUser;
    if (!user) {
      return;
    }
    this.pendingSightingDeletes.push(id);
    this.commit((state) => ({
      ...state,
      sightings: state.sightings.filter(
        (sighting) =>
          !(
            sighting.id === id &&
            sameHunter(user, sighting.hunterUserId ?? '', sighting.hunterName)
          ),
      ),
    }));
  }

  addStand(type: PlaceType, code: string, x?: number, y?: number): void {
    if (!this.isAdmin()) {
      return;
    }
    const clean = code.trim();
    if (!clean) {
      return;
    }
    const s = this.strings();
    const feedingKind = feedingKindFromPlace(type);
    const feeding = feedingKind !== null;
    const names = { small: s.feedingSmall, large: s.feedingLarge, automatic: s.feedingAutomatic };
    const kind = feedingKind ? names[feedingKind] : s.huntingStand;
    const stand: Stand = {
      id: `custom-${newId()}`,
      code: clean,
      name: `${kind} ${clean}`,
      type: feeding ? 'feeding' : 'hunting',
      feedingKind,
      custom: true,
    };
    if (typeof x === 'number' && typeof y === 'number') {
      stand.x = clamp(x, 0.02, 0.98);
      stand.y = clamp(y, 0.02, 0.98);
    }
    const custom = [...this.store().customStands, stand];
    this.commit((state) => ({
      ...state,
      customStands: custom,
      catalog: mergeCatalog(this.baseCatalog, custom, state.removedStandIds),
    }));
  }

  deleteStand(standId: string): void {
    if (!this.isAdmin()) {
      return;
    }
    const custom = this.store().customStands.filter((stand) => stand.id !== standId);
    const removed = [...new Set([...this.store().removedStandIds, standId])];
    const occupancies = { ...this.store().occupancies };
    const occ = occupancies[standId];
    if (occ) {
      this.pendingOccupancyDeletes.push(occupancyKey(occ));
    }
    delete occupancies[standId];
    this.commit((state) => ({
      ...state,
      customStands: custom,
      removedStandIds: removed,
      catalog: mergeCatalog(this.baseCatalog, custom, removed),
      occupancies,
    }));
  }

  joinDuckHunt(): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user || isSignedUpForDucks(current)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    this.addDuck(
      {
        id: newId(),
        hunterUserId: user.id,
        hunterName: user.displayName,
        huntingDay: day,
        atEpochMs: now,
      },
      'duck',
      user,
      day,
      now,
    );
  }

  leaveDuckHunt(): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user) {
      return;
    }
    const mine = todaysDuckSignups(current).find(
      (signup) => !signup.forTourist && sameHunter(user, signup.hunterUserId ?? '', signup.hunterName),
    );
    if (!mine) {
      return;
    }
    this.pendingDuckDeletes.push(mine.id);
    const now = Date.now();
    const day = currentHuntingDay();
    const event = this.duckEvent('duck-leave', user, day, now);
    this.pendingClaimUpserts.push(event);
    this.commit((state) => ({
      ...state,
      duckSignups: state.duckSignups.filter((signup) => signup.id !== mine.id),
      claimEvents: [event, ...state.claimEvents],
    }));
  }

  addDuckTourist(): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user || !canBookForGuests(current)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    this.addDuck(
      {
        id: newId(),
        hunterName: this.strings().takeForTourist,
        huntingDay: day,
        atEpochMs: now,
        forTourist: true,
        bookedByUserId: user.id,
        bookedByName: user.displayName,
      },
      'duck-tourist',
      user,
      day,
      now,
    );
  }

  removeDuckSignup(id: string): void {
    this.pendingDuckDeletes.push(id);
    this.commit((state) => ({
      ...state,
      duckSignups: state.duckSignups.filter((signup) => signup.id !== id),
    }));
  }

  refreshHuntingDay(): void {
    this.store.update((state) => ({
      ...state,
      huntingDay: currentHuntingDay(),
      nextResetLabel: nextResetLabel(),
    }));
  }

  private adopt(user: Member): void {
    this.store.update((state) => ({
      ...state,
      users: [...state.users.filter((item) => item.id !== user.id), user],
      currentUser: user,
      hunterName: user.displayName,
      authError: null,
    }));
  }

  private commit(update: (state: ClubState) => ClubState): void {
    this.store.update(update);
    void this.persist();
  }

  private publish(
    occupancies: ClubState['occupancies'],
    event: ClaimEvent,
    huntingDay?: string,
  ): void {
    this.pendingClaimUpserts.push(event);
    this.commit((state) => ({
      ...state,
      occupancies,
      claimEvents: [event, ...state.claimEvents],
      ...(huntingDay ? { huntingDay } : {}),
    }));
  }

  private addDuck(signup: DuckSignup, type: string, user: Member, day: string, now: number): void {
    const event = this.duckEvent(type, user, day, now);
    this.pendingDuckUpserts.push(signup);
    this.pendingClaimUpserts.push(event);
    this.commit((state) => ({
      ...state,
      duckSignups: [signup, ...state.duckSignups],
      huntingDay: day,
      claimEvents: [event, ...state.claimEvents],
    }));
  }

  private duckEvent(type: string, user: Member, day: string, now: number): ClaimEvent {
    return {
      id: newId(),
      type,
      hunterUserId: user.id,
      hunterName: user.displayName,
      toStandId: 'duck-hunt',
      toStandCode: '',
      huntingDay: day,
      atEpochMs: now,
    };
  }

  private attachWatch(): void {
    this.stopWatch?.();
    this.stopWatch =
      this.repository.watchLive?.((live) => {
        this.store.update((state) => {
          const usersNext = live.users ? this.hydrateMembers(live.users) : state.users;
          const currentNext = state.currentUser
            ? (usersNext.find((user) => user.id === state.currentUser?.id) ?? state.currentUser)
            : null;
          if (live.allStands && this.baseCatalog) {
            this.baseCatalog = {
              ...this.baseCatalog,
              stands: mergeRemoteStands(this.fileStands, live.allStands),
            };
          }
          const remoteIds = new Set((live.allStands ?? []).map((stand) => stand.id));
          const customNext = (live.customStands ?? state.customStands).filter(
            (stand) => !remoteIds.has(stand.id),
          );
          const removedNext = live.removedStandIds ?? state.removedStandIds;
          return {
            ...state,
            users: usersNext,
            currentUser: currentNext,
            hunterName: currentNext?.displayName ?? state.hunterName,
            customStands: customNext,
            removedStandIds: removedNext,
            catalog: mergeCatalog(this.baseCatalog, customNext, removedNext),
            occupancies: live.occupancies
              ? occupanciesByStand(live.occupancies, state.huntingDay)
              : state.occupancies,
            sightings: live.sightings ? newest(live.sightings) : state.sightings,
            claimEvents: live.claimEvents ? newest(live.claimEvents) : state.claimEvents,
            duckSignups: live.duckSignups ? newest(live.duckSignups) : state.duckSignups,
          };
        });
      }) ?? null;
  }

  private fail(message: string): false {
    this.store.update((state) => ({ ...state, authError: message }));
    return false;
  }

  private hydrateMembers(users: Member[]): Member[] {
    return users.map((user) => {
      const firstName = user.firstName?.trim() || user.displayName || '';
      const lastName = user.lastName?.trim() ?? '';
      return {
        ...user,
        firstName,
        lastName,
        displayName: user.displayName || memberDisplayName(firstName, lastName),
        licenseNumber: user.licenseNumber ?? '',
        status: user.status ?? 'MEMBER',
      };
    });
  }

  private async persist(): Promise<void> {
    const snapshot = this.store();
    const payload: ClubSnapshot = {
      hunterName: snapshot.hunterName,
      occupancies: Object.values(snapshot.occupancies),
      sightings: snapshot.sightings,
      users: snapshot.users,
      currentUserId: snapshot.currentUser?.id ?? null,
      language: snapshot.language,
      customStands: snapshot.customStands,
      removedStandIds: snapshot.removedStandIds,
      claimEvents: snapshot.claimEvents,
      duckSignups: snapshot.duckSignups,
      deletedOccupancyKeys: this.pendingOccupancyDeletes.splice(0),
      deletedSightingIds: this.pendingSightingDeletes.splice(0),
      deletedDuckSignupIds: this.pendingDuckDeletes.splice(0),
      upsertOccupancies: this.pendingOccupancyUpserts.splice(0),
      upsertSightings: this.pendingSightingUpserts.splice(0),
      upsertClaimEvents: this.pendingClaimUpserts.splice(0),
      upsertDuckSignups: this.pendingDuckUpserts.splice(0),
    };
    await this.repository.saveSnapshot(payload);
  }
}

function newest<T extends { atEpochMs: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.atEpochMs - a.atEpochMs);
}

function occupanciesByStand(occupancies: Occupancy[], huntingDay: string): Record<string, Occupancy> {
  const map: Record<string, Occupancy> = {};
  for (const occ of occupancies) {
    const existing = map[occ.standId];
    if (!existing || occ.huntingDay === huntingDay) {
      map[occ.standId] = occ;
    }
  }
  return map;
}

function emptyState(): ClubState {
  return {
    hunterName: '',
    catalog: null,
    occupancies: {},
    sightings: [],
    huntingDay: currentHuntingDay(),
    nextResetLabel: nextResetLabel(),
    language: 'en',
    currentUser: null,
    users: [],
    customStands: [],
    removedStandIds: [],
    claimEvents: [],
    duckSignups: [],
    authError: null,
    splashDone: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function seedLocalAdmin(): Promise<Member> {
  const salt = 'patka-admin-salt';
  return {
    id: 'seed-admin',
    firstName: 'Admin',
    lastName: 'Patka',
    displayName: 'Admin Patka',
    licenseNumber: 'ADMIN',
    passwordSalt: salt,
    passwordHash: await hashPassword('patka1946', salt),
    role: 'ADMIN',
    status: 'MEMBER',
  };
}

