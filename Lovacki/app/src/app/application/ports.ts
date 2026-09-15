import { ClubSnapshot, Member, Occupancy, Sighting, Stand, StandCatalog, ClaimEvent, DuckSignup } from '../domain';

export type Unsubscribe = () => void;

export interface ClubRepository {
  loadCatalog(): Promise<StandCatalog>;
  loadSnapshot(): Promise<ClubSnapshot>;
  saveSnapshot(snapshot: ClubSnapshot): Promise<void>;
  watchLive?(
    onChange: (live: {
      occupancies?: Occupancy[];
      sightings?: Sighting[];
      claimEvents?: ClaimEvent[];
      duckSignups?: DuckSignup[];
      users?: Member[];
      customStands?: Stand[];
      removedStandIds?: string[];
      allStands?: Stand[];
    }) => void,
  ): Unsubscribe;
}

export interface AuthSession {
  login(licenseNumber: string, password: string, members: Member[]): Promise<Member>;
  register(input: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    password: string;
    role: Member['role'];
    members: Member[];
  }): Promise<Member>;
  logout(): Promise<void>;
}
