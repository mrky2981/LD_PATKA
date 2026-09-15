import {
  ClubState,
  DuckSignup,
  FeedingKind,
  MapPinKind,
  Member,
  Occupancy,
  PlaceType,
  Sighting,
  Stand,
  StandCatalog,
} from './types';

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
  return isFeeding(stand) && stand.feedingKind === 'large';
}

export function isAutomaticFeeding(stand: Stand): boolean {
  return isFeeding(stand) && stand.feedingKind === 'automatic';
}

export function hasMapPosition(stand: Stand): boolean {
  return typeof stand.x === 'number' && typeof stand.y === 'number';
}

export function mapPinKind(stand: Stand): MapPinKind | null {
  if (!hasMapPosition(stand)) {
    return null;
  }
  if (isAutomaticFeeding(stand)) {
    return 'automatic';
  }
  if (isSmallFeeding(stand)) {
    return 'small';
  }
  if (isLargeFeeding(stand)) {
    return 'large';
  }
  return 'hunting';
}

export function feedingKindFromPlace(type: PlaceType): FeedingKind | null {
  if (type === 'feeding-small') {
    return 'small';
  }
  if (type === 'feeding-large') {
    return 'large';
  }
  if (type === 'feeding-automatic') {
    return 'automatic';
  }
  return null;
}

export function isAdmin(user: Member | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function isKeeper(user: Member | null | undefined): boolean {
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

export function sameHunter(user: Member, hunterUserId: string, hunterName: string): boolean {
  if (hunterUserId) {
    return hunterUserId === user.id;
  }
  return hunterName.toLowerCase() === user.displayName.toLowerCase();
}

export function feedingKindColor(kind: FeedingKind | null | undefined): string {
  if (kind === 'small') {
    return 'var(--feeding-small)';
  }
  if (kind === 'automatic') {
    return 'var(--feeding-auto)';
  }
  return 'var(--feeding)';
}

export function mergeCatalog(
  base: StandCatalog | null,
  custom: Stand[],
  removed: string[],
): StandCatalog | null {
  if (!base) {
    return null;
  }
  const hidden = new Set(removed);
  return {
    ...base,
    stands: [...base.stands, ...custom].filter((stand) => !hidden.has(stand.id)),
  };
}

/** Overlay Firestore stands onto the file catalog without wiping it when the cloud copy is still empty. */
export function mergeRemoteStands(fileStands: Stand[], remoteStands: Stand[]): Stand[] {
  if (remoteStands.length === 0) {
    return fileStands;
  }
  const fileIds = new Set(fileStands.map((stand) => stand.id));
  const seeded = remoteStands.some((stand) => fileIds.has(stand.id));
  if (seeded) {
    return remoteStands;
  }
  const extras = remoteStands.filter((stand) => !fileIds.has(stand.id));
  return [...fileStands, ...extras];
}

export function occupancyKey(occ: Pick<Occupancy, 'huntingDay' | 'standId'>): string {
  return `${occ.huntingDay}_${occ.standId}`;
}

export function ownHuntingStandIds(state: ClubState): string[] {
  const user = state.currentUser;
  if (!user) {
    return [];
  }
  return Object.values(state.occupancies)
    .filter(
      (occ) =>
        occ.huntingDay === state.huntingDay &&
        !occ.forTourist &&
        sameHunter(user, occ.hunterUserId ?? '', occ.hunterName),
    )
    .map((occ) => occ.standId);
}

export function normalizeLicense(value: string): string {
  return value.trim().toLowerCase();
}
