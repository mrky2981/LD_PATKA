/**
 * Seed LD Patka catalog + admin into the Firebase emulator or a cloud project.
 * Usage (emulator): node scripts/seed-club.mjs --emulator
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const useEmulator =
  process.argv.includes('--emulator') ||
  process.env.USE_EMULATORS === '1' ||
  Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, '../public/stands.json'), 'utf8'));
const app = initializeApp({
  apiKey: 'demo-ld-patka',
  authDomain: 'demo-ld-patka.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'demo-ld-patka',
});
const db = getFirestore(app);
const auth = getAuth(app);
if (useEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

const clubRoot = 'clubs/patka';
let adminUid = '';
try {
  const cred = await createUserWithEmailAndPassword(auth, 'admin@members.ld-patka.hr', 'patka1946');
  adminUid = cred.user.uid;
} catch {
  const cred = await signInWithEmailAndPassword(auth, 'admin@members.ld-patka.hr', 'patka1946');
  adminUid = cred.user.uid;
}

await setDoc(doc(db, `${clubRoot}/members/${adminUid}`), {
  id: adminUid,
  firstName: 'Admin',
  lastName: 'Patka',
  displayName: 'Admin Patka',
  licenseNumber: 'ADMIN',
  role: 'ADMIN',
  status: 'MEMBER',
});
await setDoc(doc(db, clubRoot), { club: catalog.club, map: catalog.map, removedStandIds: [] });
for (const stand of catalog.stands) {
  const payload = Object.fromEntries(Object.entries(stand).filter(([, value]) => value !== undefined));
  await setDoc(doc(db, `${clubRoot}/stands/${stand.id}`), payload);
}

const stands = await getDocs(collection(db, `${clubRoot}/stands`));
console.log('Seeded admin ADMIN / patka1946');
console.log('Stands in Firestore:', stands.size);
