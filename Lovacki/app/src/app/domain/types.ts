export type UserRole = 'MEMBER' | 'ADMIN';
export type HunterStatus = 'MEMBER' | 'KEEPER';
export type AppLang = 'en' | 'hr';
export type StandType = 'hunting' | 'feeding';
export type FeedingKind = 'large' | 'small' | 'automatic';
export type MapPinKind = 'hunting' | 'large' | 'small' | 'automatic';
export type PlaceType = 'hunting' | 'feeding-large' | 'feeding-small' | 'feeding-automatic';

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
  type: StandType;
  x?: number;
  y?: number;
  feedingKind?: FeedingKind | null;
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

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  licenseNumber: string;
  role: UserRole;
  status: HunterStatus;
  passwordSalt?: string;
  passwordHash?: string;
}

/** @deprecated Use Member. Kept during local snapshot migration. */
export type UserAccount = Member;

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
  currentUser: Member | null;
  users: Member[];
  customStands: Stand[];
  removedStandIds: string[];
  claimEvents: ClaimEvent[];
  duckSignups: DuckSignup[];
  authError: string | null;
  splashDone: boolean;
}

export interface ClubSnapshot {
  hunterName?: string;
  occupancies?: Occupancy[];
  sightings?: Sighting[];
  users?: Member[];
  currentUserId?: string | null;
  language?: string;
  customStands?: Stand[];
  removedStandIds?: string[];
  claimEvents?: ClaimEvent[];
  duckSignups?: DuckSignup[];
  deletedOccupancyKeys?: string[];
  deletedSightingIds?: string[];
  deletedDuckSignupIds?: string[];
  upsertOccupancies?: Occupancy[];
  upsertSightings?: Sighting[];
  upsertClaimEvents?: ClaimEvent[];
  upsertDuckSignups?: DuckSignup[];
}

export const ADMIN_INVITE_CODE = 'LDADMIN';
export const LICENSE_EMAIL_DOMAIN = 'members.ld-patka.hr';

export function memberDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function licenseEmail(licenseNumber: string): string {
  const local = licenseNumber.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return `${local}@${LICENSE_EMAIL_DOMAIN}`;
}
