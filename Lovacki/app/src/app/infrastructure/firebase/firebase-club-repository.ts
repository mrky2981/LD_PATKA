import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  WriteBatch,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import {
  ClaimEvent,
  ClubSnapshot,
  DuckSignup,
  Member,
  Occupancy,
  Sighting,
  Stand,
  StandCatalog,
  licenseEmail,
  memberDisplayName,
} from '../../domain';
import { AuthSession, ClubRepository, Unsubscribe } from '../../application/ports';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { CLUB_ROOT, firebaseAuth, firebaseFirestore } from './app';

const LANG_KEY = 'ld-patka-language';

@Injectable({ providedIn: 'root' })
export class FirebaseClubRepository implements ClubRepository {
  private readonly http = inject(HttpClient);
  private readonly db = firebaseFirestore();

  async loadCatalog(): Promise<StandCatalog> {
    const file = await firstValueFrom(this.http.get<StandCatalog>('stands.json'));
    await firebaseAuth().authStateReady();
    if (!firebaseAuth().currentUser) {
      return file;
    }
    try {
      const snap = await getDocs(collection(this.db, `${CLUB_ROOT}/stands`));
      if (snap.empty) {
        return file;
      }
      const meta = await getDoc(doc(this.db, CLUB_ROOT));
      const data = meta.data() as { club?: StandCatalog['club']; map?: StandCatalog['map'] } | undefined;
      return {
        club: data?.club ?? file.club,
        map: data?.map ?? file.map,
        stands: snap.docs.map((item) => item.data() as Stand),
      };
    } catch {
      return file;
    }
  }

  async loadSnapshot(): Promise<ClubSnapshot> {
    const language = readLanguage();
    await firebaseAuth().authStateReady();
    const auth = firebaseAuth().currentUser;
    if (!auth) {
      return { language };
    }
    try {
      const [users, occupancies, sightings, claimEvents, duckSignups, meta] = await Promise.all([
        this.col<Member>('members'),
        this.col<Occupancy>('occupancies'),
        this.col<Sighting>('sightings'),
        this.col<ClaimEvent>('claimEvents'),
        this.col<DuckSignup>('duckSignups'),
        getDoc(doc(this.db, CLUB_ROOT)),
      ]);
      const removedStandIds = (meta.data()?.['removedStandIds'] as string[] | undefined) ?? [];
      return {
        users,
        occupancies,
        sightings,
        claimEvents,
        duckSignups,
        currentUserId: auth.uid,
        language,
        removedStandIds,
      };
    } catch {
      return { language, currentUserId: auth.uid };
    }
  }

  async saveSnapshot(snapshot: ClubSnapshot): Promise<void> {
    writeLanguage(snapshot.language);
    const uid = firebaseAuth().currentUser?.uid;
    if (!uid) {
      return;
    }
    const me = (snapshot.users ?? []).find((user) => user.id === uid);
    const admin = me?.role === 'ADMIN';
    const batch = writeBatch(this.db);
    for (const user of snapshot.users ?? []) {
      if (user.id !== uid && !admin) {
        continue;
      }
      const safe = { ...user };
      delete safe.passwordHash;
      delete safe.passwordSalt;
      batch.set(doc(this.db, `${CLUB_ROOT}/members/${user.id}`), stripUndefined(safe));
    }
    let ops = snapshot.users?.length ?? 0;
    ops += this.upsert(batch, 'occupancies', snapshot.upsertOccupancies, (occ) =>
      `${occ.huntingDay}_${occ.standId}`,
    );
    ops += this.remove(batch, 'occupancies', snapshot.deletedOccupancyKeys);
    ops += this.upsert(batch, 'sightings', snapshot.upsertSightings, (item) => item.id);
    ops += this.remove(batch, 'sightings', snapshot.deletedSightingIds);
    ops += this.upsert(batch, 'claimEvents', snapshot.upsertClaimEvents, (item) => item.id);
    ops += this.upsert(batch, 'duckSignups', snapshot.upsertDuckSignups, (item) => item.id);
    ops += this.remove(batch, 'duckSignups', snapshot.deletedDuckSignupIds);
    if (admin) {
      ops += this.upsert(batch, 'stands', snapshot.customStands, (stand) => stand.id);
      ops += this.remove(batch, 'stands', snapshot.removedStandIds);
      batch.set(
        doc(this.db, CLUB_ROOT),
        stripUndefined({ removedStandIds: snapshot.removedStandIds ?? [] }),
        { merge: true },
      );
      ops += 1;
    }
    if (ops === 0) {
      return;
    }
    await batch.commit();
  }

  watchLive(
    onChange: (live: {
      occupancies?: Occupancy[];
      sightings?: Sighting[];
      claimEvents?: ClaimEvent[];
      duckSignups?: DuckSignup[];
      users?: Member[];
      removedStandIds?: string[];
      allStands?: Stand[];
    }) => void,
  ): Unsubscribe {
    if (!firebaseAuth().currentUser) {
      return () => undefined;
    }
    const unsubs = [
      this.listen<Occupancy>('occupancies', (occupancies) => onChange({ occupancies })),
      this.listen<Sighting>('sightings', (sightings) => onChange({ sightings })),
      this.listen<ClaimEvent>('claimEvents', (claimEvents) => onChange({ claimEvents })),
      this.listen<DuckSignup>('duckSignups', (duckSignups) => onChange({ duckSignups })),
      this.listen<Member>('members', (users) => onChange({ users })),
      this.listen<Stand>('stands', (allStands) => onChange({ allStands })),
      onSnapshot(doc(this.db, CLUB_ROOT), (snap) => {
        onChange({
          removedStandIds: (snap.data()?.['removedStandIds'] as string[] | undefined) ?? [],
        });
      }),
    ];
    return () => unsubs.forEach((stop) => stop());
  }

  private upsert<T extends object>(
    batch: WriteBatch,
    name: string,
    items: readonly T[] | undefined,
    idOf: (item: T) => string,
  ): number {
    for (const item of items ?? []) {
      batch.set(doc(this.db, `${CLUB_ROOT}/${name}/${idOf(item)}`), stripUndefined(item));
    }
    return items?.length ?? 0;
  }

  private remove(batch: WriteBatch, name: string, ids: readonly string[] | undefined): number {
    for (const id of ids ?? []) {
      batch.delete(doc(this.db, `${CLUB_ROOT}/${name}/${id}`));
    }
    return ids?.length ?? 0;
  }

  private listen<T>(name: string, onRows: (rows: T[]) => void): Unsubscribe {
    return onSnapshot(collection(this.db, `${CLUB_ROOT}/${name}`), (snap) => {
      onRows(snap.docs.map((item) => item.data() as T));
    });
  }

  private async col<T>(name: string): Promise<T[]> {
    const snap = await getDocs(collection(this.db, `${CLUB_ROOT}/${name}`));
    return snap.docs.map((item) => item.data() as T);
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseAuthSession implements AuthSession {
  private readonly db = firebaseFirestore();

  async login(licenseNumber: string, password: string, _members: Member[]): Promise<Member> {
    const cred = await signInWithEmailAndPassword(
      firebaseAuth(),
      licenseEmail(licenseNumber),
      password,
    );
    return this.readMember(cred.user.uid);
  }

  async register(input: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    password: string;
    role: Member['role'];
    members: Member[];
  }): Promise<Member> {
    if (
      input.members.some(
        (user) => user.licenseNumber.trim().toLowerCase() === input.licenseNumber.trim().toLowerCase(),
      )
    ) {
      throw new Error('license-taken');
    }
    try {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth(),
        licenseEmail(input.licenseNumber),
        input.password,
      );
      const member: Member = {
        id: cred.user.uid,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        displayName: memberDisplayName(input.firstName, input.lastName),
        licenseNumber: input.licenseNumber.trim(),
        role: input.role,
        status: 'MEMBER',
      };
      await setDoc(doc(this.db, `${CLUB_ROOT}/members/${member.id}`), stripUndefined(member));
      return member;
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === 'auth/email-already-in-use') {
        throw new Error('license-taken');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth());
  }

  private async readMember(uid: string): Promise<Member> {
    const snap = await getDoc(doc(this.db, `${CLUB_ROOT}/members/${uid}`));
    if (snap.exists()) {
      return snap.data() as Member;
    }
    throw new Error('bad-login');
  }
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function readLanguage(): string | undefined {
  try {
    return localStorage.getItem(LANG_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeLanguage(language?: string): void {
  if (!language) {
    return;
  }
  try {
    localStorage.setItem(LANG_KEY, language);
  } catch {
    // Private browsing / blocked storage must not crash the app.
  }
}
