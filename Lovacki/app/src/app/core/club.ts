import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { hashPassword, newId, randomSalt } from './crypto';
import { currentHuntingDay, nextResetLabel } from './hunting-day';
import { stringsFor } from './l10n';
import {
  ADMIN_INVITE_CODE,
  Animal,
  AppLang,
  ClaimEvent,
  ClubState,
  DuckSignup,
  HunterStatus,
  Occupancy,
  PersistedClub,
  Stand,
  StandCatalog,
  UserAccount,
  canBookForGuests,
  isAdmin,
  isHunting,
  isSignedUpForDucks,
  isTaken,
  isTakenByMe,
  sameHunter,
  todaysDuckSignups,
} from './models';

const STORE_KEY = 'ld-patka-club-state';

@Injectable({ providedIn: 'root' })
export class ClubService {
  private readonly http = inject(HttpClient);
  private baseCatalog: StandCatalog | null = null;
  private readonly store = signal<ClubState>(emptyState());

  readonly state = this.store.asReadonly();
  readonly strings = computed(() => stringsFor(this.store().language));
  readonly isLoggedIn = computed(() => this.store().currentUser !== null);
  readonly isAdmin = computed(() => isAdmin(this.store().currentUser));
  readonly splashDone = computed(() => this.store().splashDone);
  readonly focusStandId = signal<string | null>(null);

  async init(): Promise<void> {
    try {
      this.baseCatalog = await firstValueFrom(this.http.get<StandCatalog>('stands.json'));
      const saved = this.load();
      const seed = await this.seedAdmin();
      const needsPurge = !saved.purgedNonAdmins;
      let users: UserAccount[];
      if (needsPurge) {
        const admins = (saved.users ?? []).filter((user) => user.role === 'ADMIN');
        const hasSeed = admins.some(
          (user) => user.id === seed.id || user.username.toLowerCase() === 'admin',
        );
        users = hasSeed ? (admins.length ? admins : [seed]) : [seed, ...admins];
      } else {
        users = saved.users?.length ? saved.users : [seed];
      }
      const current = users.find((user) => user.id === saved.currentUserId) ?? null;
      const custom = saved.customStands ?? [];
      const removed = saved.removedStandIds ?? [];
      this.store.set({
        hunterName: current?.displayName ?? '',
        catalog: this.mergeCatalog(custom, removed),
        occupancies: Object.fromEntries((saved.occupancies ?? []).map((occ) => [occ.standId, occ])),
        sightings: [...(saved.sightings ?? [])].sort((a, b) => b.atEpochMs - a.atEpochMs),
        huntingDay: currentHuntingDay(),
        nextResetLabel: nextResetLabel(),
        language: saved.language === 'hr' ? 'hr' : 'en',
        currentUser: current,
        users,
        customStands: custom,
        removedStandIds: removed,
        claimEvents: [...(saved.claimEvents ?? [])].sort((a, b) => b.atEpochMs - a.atEpochMs),
        duckSignups: [...(saved.duckSignups ?? [])].sort((a, b) => b.atEpochMs - a.atEpochMs),
        authError: null,
        splashDone: false,
      });
      document.documentElement.lang = saved.language === 'hr' ? 'hr' : 'en';
      if (needsPurge) {
        this.persist();
      }
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
    this.store.update((state) => ({ ...state, language: lang, authError: null }));
    this.persist();
  }

  async login(username: string, password: string): Promise<boolean> {
    const state = this.store();
    const key = username.trim();
    const user = state.users.find(
      (account) =>
        account.username.toLowerCase() === key.toLowerCase() ||
        (account.licenseNumber ?? '').toLowerCase() === key.toLowerCase(),
    );
    if (!user || user.passwordHash !== (await hashPassword(password, user.passwordSalt))) {
      this.store.update((current) => ({
        ...current,
        authError: stringsFor(current.language).errorBadLogin,
      }));
      return false;
    }
    this.store.update((current) => ({
      ...current,
      currentUser: user,
      hunterName: user.displayName,
      authError: null,
    }));
    this.persist();
    return true;
  }

  async register(
    displayName: string,
    username: string,
    password: string,
    confirm: string,
    adminCode: string,
    licenseNumber: string,
  ): Promise<boolean> {
    const s = this.strings();
    const license = licenseNumber.trim();
    if (!displayName.trim() || !username.trim() || !password) {
      return this.fail(s.errorBlank);
    }
    if (!license) {
      return this.fail(s.errorLicenseBlank);
    }
    if (license.length < 3) {
      return this.fail(s.errorLicenseShort);
    }
    if (password.length < 4) {
      return this.fail(s.errorShortPassword);
    }
    if (password !== confirm) {
      return this.fail(s.errorPasswordMatch);
    }
    const users = this.store().users;
    if (users.some((user) => user.username.toLowerCase() === username.trim().toLowerCase())) {
      return this.fail(s.errorUserTaken);
    }
    if (
      users.some(
        (user) =>
          Boolean(user.licenseNumber) &&
          (user.licenseNumber ?? '').toLowerCase() === license.toLowerCase(),
      )
    ) {
      return this.fail(s.errorLicenseTaken);
    }
    const wantsAdmin = adminCode.trim().length > 0;
    if (wantsAdmin && adminCode.trim() !== ADMIN_INVITE_CODE) {
      return this.fail(s.errorBadAdminCode);
    }
    const salt = randomSalt();
    const user: UserAccount = {
      id: newId(),
      username: username.trim(),
      displayName: displayName.trim(),
      passwordSalt: salt,
      passwordHash: await hashPassword(password, salt),
      role: wantsAdmin ? 'ADMIN' : 'MEMBER',
      licenseNumber: license,
      status: 'MEMBER',
    };
    this.store.update((state) => ({
      ...state,
      users: [...state.users, user],
      currentUser: user,
      hunterName: user.displayName,
      authError: null,
    }));
    this.persist();
    return true;
  }

  logout(): void {
    this.store.update((state) => ({
      ...state,
      currentUser: null,
      hunterName: '',
      authError: null,
    }));
    this.persist();
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
    const mine = Object.values(current.occupancies)
      .filter(
        (occ) =>
          occ.huntingDay === current.huntingDay &&
          !occ.forTourist &&
          sameHunter(user, occ.hunterUserId ?? '', occ.hunterName),
      )
      .map((occ) => occ.standId);
    if (mine.length === 1 && mine[0] === standId) {
      return;
    }
    const fromId = mine[0];
    const fromStand = fromId
      ? current.catalog?.stands.find((stand) => stand.id === fromId)
      : undefined;
    const toStand = current.catalog?.stands.find((stand) => stand.id === standId);
    if (!toStand) {
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
      delete next[id];
    }
    next[standId] = {
      standId,
      hunterName: user.displayName,
      huntingDay: day,
      takenAtEpochMs: now,
      hunterUserId: user.id,
    };
    this.store.update((state) => ({
      ...state,
      occupancies: next,
      huntingDay: day,
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
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
    this.store.update((state) => ({
      ...state,
      occupancies: { ...state.occupancies, [standId]: occupancy },
      huntingDay: day,
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
  }

  setHunterStatus(userId: string, status: HunterStatus): void {
    if (!this.isAdmin()) {
      return;
    }
    const users = this.store().users.map((account) =>
      account.id === userId ? { ...account, status } : account,
    );
    const current = users.find((account) => account.id === this.store().currentUser?.id) ?? null;
    this.store.update((state) => ({
      ...state,
      users,
      currentUser: current,
      hunterName: current?.displayName ?? state.hunterName,
    }));
    this.persist();
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
    const next = { ...current.occupancies };
    delete next[standId];
    this.store.update((state) => ({
      ...state,
      occupancies: next,
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
  }

  addSighting(standId: string, animal: Animal, count: number, note: string): void {
    const user = this.store().currentUser;
    if (!user) {
      return;
    }
    const sighting = {
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
    this.store.update((state) => ({ ...state, sightings: [sighting, ...state.sightings] }));
    this.persist();
  }

  deleteSighting(id: string): void {
    const user = this.store().currentUser;
    if (!user) {
      return;
    }
    this.store.update((state) => ({
      ...state,
      sightings: state.sightings.filter(
        (sighting) =>
          !(
            sighting.id === id &&
            sameHunter(user, sighting.hunterUserId ?? '', sighting.hunterName)
          ),
      ),
    }));
    this.persist();
  }

  addStand(type: string, code: string, x: number, y: number): void {
    if (!this.isAdmin()) {
      return;
    }
    const clean = code.trim();
    if (!clean) {
      return;
    }
    const s = this.strings();
    const feeding = type.startsWith('feeding');
    const feedingKind = type === 'feeding-small' ? 'small' : feeding ? 'large' : null;
    const kind =
      feedingKind === 'small' ? s.feedingSmall : feedingKind === 'large' ? s.feedingLarge : s.huntingStand;
    const stand: Stand = {
      id: `custom-${newId()}`,
      code: clean,
      name: `${kind} ${clean}`,
      type: feeding ? 'feeding' : 'hunting',
      x: clamp(x, 0.02, 0.98),
      y: clamp(y, 0.02, 0.98),
      feedingKind,
      custom: true,
    };
    const custom = [...this.store().customStands, stand];
    this.store.update((state) => ({
      ...state,
      customStands: custom,
      catalog: this.mergeCatalog(custom, state.removedStandIds),
    }));
    this.persist();
  }

  deleteStand(standId: string): void {
    if (!this.isAdmin()) {
      return;
    }
    const custom = this.store().customStands.filter((stand) => stand.id !== standId);
    const removed = [...new Set([...this.store().removedStandIds, standId])];
    const occupancies = { ...this.store().occupancies };
    delete occupancies[standId];
    this.store.update((state) => ({
      ...state,
      customStands: custom,
      removedStandIds: removed,
      catalog: this.mergeCatalog(custom, removed),
      occupancies,
    }));
    this.persist();
  }

  joinDuckHunt(): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user || isSignedUpForDucks(current)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    const signup: DuckSignup = {
      id: newId(),
      hunterUserId: user.id,
      hunterName: user.displayName,
      huntingDay: day,
      atEpochMs: now,
    };
    const event = this.duckEvent('duck', user, day, now);
    this.store.update((state) => ({
      ...state,
      duckSignups: [signup, ...state.duckSignups],
      huntingDay: day,
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
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
    const now = Date.now();
    const day = currentHuntingDay();
    const event = this.duckEvent('duck-leave', user, day, now);
    this.store.update((state) => ({
      ...state,
      duckSignups: state.duckSignups.filter((signup) => signup.id !== mine.id),
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
  }

  addDuckTourist(): void {
    const current = this.store();
    const user = current.currentUser;
    if (!user || !canBookForGuests(current)) {
      return;
    }
    const now = Date.now();
    const day = currentHuntingDay();
    const signup: DuckSignup = {
      id: newId(),
      hunterName: this.strings().takeForTourist,
      huntingDay: day,
      atEpochMs: now,
      forTourist: true,
      bookedByUserId: user.id,
      bookedByName: user.displayName,
    };
    const event = this.duckEvent('duck-tourist', user, day, now);
    this.store.update((state) => ({
      ...state,
      duckSignups: [signup, ...state.duckSignups],
      huntingDay: day,
      claimEvents: [event, ...state.claimEvents],
    }));
    this.persist();
  }

  removeDuckSignup(id: string): void {
    this.store.update((state) => ({
      ...state,
      duckSignups: state.duckSignups.filter((signup) => signup.id !== id),
    }));
    this.persist();
  }

  refreshHuntingDay(): void {
    this.store.update((state) => ({
      ...state,
      huntingDay: currentHuntingDay(),
      nextResetLabel: nextResetLabel(),
    }));
  }

  private duckEvent(type: string, user: UserAccount, day: string, now: number): ClaimEvent {
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

  private fail(message: string): false {
    this.store.update((state) => ({ ...state, authError: message }));
    return false;
  }

  private mergeCatalog(custom: Stand[], removed: string[]): StandCatalog | null {
    if (!this.baseCatalog) {
      return null;
    }
    const hidden = new Set(removed);
    return {
      ...this.baseCatalog,
      stands: [...this.baseCatalog.stands, ...custom].filter((stand) => !hidden.has(stand.id)),
    };
  }

  private persist(): void {
    const snapshot = this.store();
    const payload: PersistedClub = {
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
      purgedNonAdmins: true,
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing / blocked storage must not crash bootstrap.
    }
  }

  private load(): PersistedClub {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as PersistedClub) : {};
    } catch {
      return {};
    }
  }

  private async seedAdmin(): Promise<UserAccount> {
    const salt = 'patka-admin-salt';
    return {
      id: 'seed-admin',
      username: 'admin',
      displayName: 'Admin',
      passwordSalt: salt,
      passwordHash: await hashPassword('patka1946', salt),
      role: 'ADMIN',
      licenseNumber: 'ADMIN',
      status: 'MEMBER',
    };
  }
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
