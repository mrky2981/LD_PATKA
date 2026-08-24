export type UserRole = 'MEMBER' | 'ADMIN';
export type HunterStatus = 'MEMBER' | 'KEEPER';
export type AppLang = 'en' | 'hr';

export interface ClubInfo {
  name: string;
  ground: string;
  areaHa: number;
  founded: number;
  timezone: string;
  resetHour: number;
}

export interface MapInfo {
  width: number;
  height: number;
  file: string;
}

export interface Stand {
  id: string;
  code: string;
  name: string;
  type: 'hunting' | 'feeding' | string;
  x: number;
  y: number;
  feedingKind?: string | null;
  custom?: boolean;
}

export interface StandCatalog {
  club: ClubInfo;
  map: MapInfo;
  stands: Stand[];
}

export interface Occupancy {
  standId: string;
  hunterName: string;
  huntingDay: string;
  takenAtEpochMs: number;
  hunterUserId?: string;
  forTourist?: boolean;
  touristName?: string;
  bookedByUserId?: string;
  bookedByName?: string;
}

export interface Sighting {
  id: string;
  standId: string;
  hunterName: string;
  animalId: string;
  animalLabel: string;
  count: number;
  note: string;
  atEpochMs: number;
  hunterUserId?: string;
}

export interface ClaimEvent {
  id: string;
  type: string;
  hunterUserId: string;
  hunterName: string;
  fromStandId?: string | null;
  fromStandCode?: string | null;
  toStandId: string;
  toStandCode: string;
  huntingDay: string;
  atEpochMs: number;
  guestName?: string | null;
}

export interface DuckSignup {
  id: string;
  hunterUserId?: string;
  hunterName: string;
  huntingDay: string;
  atEpochMs: number;
  forTourist?: boolean;
  bookedByUserId?: string;
  bookedByName?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserRole;
  licenseNumber?: string;
  status?: HunterStatus;
}

export interface PersistedClub {
  hunterName?: string;
  occupancies?: Occupancy[];
  sightings?: Sighting[];
  users?: UserAccount[];
  currentUserId?: string | null;
  language?: string;
  customStands?: Stand[];
  removedStandIds?: string[];
  claimEvents?: ClaimEvent[];
  duckSignups?: DuckSignup[];
  purgedNonAdmins?: boolean;
}

export interface Animal {
  id: string;
  label: string;
  emoji: string;
}

export interface ClubState {
  hunterName: string;
  catalog: StandCatalog | null;
  occupancies: Record<string, Occupancy>;
  sightings: Sighting[];
  huntingDay: string;
  nextResetLabel: string;
  language: AppLang;
  currentUser: UserAccount | null;
  users: UserAccount[];
  customStands: Stand[];
  removedStandIds: string[];
  claimEvents: ClaimEvent[];
  duckSignups: DuckSignup[];
  authError: string | null;
  splashDone: boolean;
}

export const ADMIN_INVITE_CODE = 'LDADMIN';

export function isHunting(stand: Stand): boolean {
  return stand.type === 'hunting';
}

export function isFeeding(stand: Stand): boolean {
  return stand.type === 'feeding';
}

export function isSmallFeeding(stand: Stand): boolean {
  return isFeeding(stand) && stand.feedingKind === 'small';
}

export function isLargeFeeding(stand: Stand): boolean {
  return isFeeding(stand) && !isSmallFeeding(stand);
}

export function isAdmin(user: UserAccount | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function isKeeper(user: UserAccount | null | undefined): boolean {
  return user?.status === 'KEEPER';
}

export function isTouristOccupancy(occ: Occupancy): boolean {
  return Boolean(occ.forTourist || occ.touristName);
}

export function isTouristSignup(signup: DuckSignup): boolean {
  return Boolean(signup.forTourist);
}

export function occupancyFor(state: ClubState, standId: string): Occupancy | null {
  const occ = state.occupancies[standId];
  if (!occ || occ.huntingDay !== state.huntingDay) {
    return null;
  }
  return occ;
}

export function isTaken(state: ClubState, standId: string): boolean {
  return occupancyFor(state, standId) !== null;
}

export function isTakenByMe(state: ClubState, standId: string): boolean {
  const occ = occupancyFor(state, standId);
  const user = state.currentUser;
  if (!occ || !user || isTouristOccupancy(occ)) {
    return false;
  }
  return (
    occ.hunterUserId === user.id ||
    occ.hunterName.toLowerCase() === user.displayName.toLowerCase()
  );
}

export function canRelease(state: ClubState, standId: string): boolean {
  const occ = occupancyFor(state, standId);
  const user = state.currentUser;
  if (!occ || !user) {
    return false;
  }
  if (isTakenByMe(state, standId)) {
    return true;
  }
  return isTouristOccupancy(occ) && (occ.bookedByUserId === user.id || isAdmin(user));
}

export function canBookForGuests(state: ClubState): boolean {
  return isAdmin(state.currentUser) || isKeeper(state.currentUser);
}

export function huntingStands(state: ClubState): Stand[] {
  return state.catalog?.stands.filter(isHunting) ?? [];
}

export function feedingStands(state: ClubState): Stand[] {
  return state.catalog?.stands.filter(isFeeding) ?? [];
}

export function takenCount(state: ClubState): number {
  return huntingStands(state).filter((stand) => isTaken(state, stand.id)).length;
}

export function availableCount(state: ClubState): number {
  return huntingStands(state).length - takenCount(state);
}

export function todaysDuckSignups(state: ClubState): DuckSignup[] {
  return state.duckSignups
    .filter((signup) => signup.huntingDay === state.huntingDay)
    .sort((a, b) => a.atEpochMs - b.atEpochMs);
}

export function isSignedUpForDucks(state: ClubState): boolean {
  const user = state.currentUser;
  if (!user) {
    return false;
  }
  return todaysDuckSignups(state).some(
    (signup) =>
      !isTouristSignup(signup) &&
      (signup.hunterUserId === user.id ||
        signup.hunterName.toLowerCase() === user.displayName.toLowerCase()),
  );
}

export function canRemoveDuckSignup(state: ClubState, signup: DuckSignup): boolean {
  const user = state.currentUser;
  if (!user) {
    return false;
  }
  if (!isTouristSignup(signup)) {
    return (
      signup.hunterUserId === user.id ||
      signup.hunterName.toLowerCase() === user.displayName.toLowerCase()
    );
  }
  return signup.bookedByUserId === user.id || isAdmin(user);
}

export function mySightings(state: ClubState): Sighting[] {
  const user = state.currentUser;
  if (!user) {
    return [];
  }
  return state.sightings.filter((sighting) => {
    if (sighting.hunterUserId) {
      return sighting.hunterUserId === user.id;
    }
    return sighting.hunterName.toLowerCase() === user.displayName.toLowerCase();
  });
}

export function sameHunter(user: UserAccount, hunterUserId: string, hunterName: string): boolean {
  if (hunterUserId) {
    return hunterUserId === user.id;
  }
  return hunterName.toLowerCase() === user.displayName.toLowerCase();
}
