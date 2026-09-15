import { isDevMode } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

let connected = false;

export function firebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(environment.firebase);
}

export function firebaseAuth(): Auth {
  const auth = getAuth(firebaseApp());
  connectEmulatorsOnce(auth, getFirestore(firebaseApp()));
  return auth;
}

export function firebaseFirestore(): Firestore {
  const db = getFirestore(firebaseApp());
  connectEmulatorsOnce(getAuth(firebaseApp()), db);
  return db;
}

function connectEmulatorsOnce(auth: Auth, db: Firestore): void {
  if (connected || !environment.useEmulators || !isDevMode()) {
    return;
  }
  connected = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const CLUB_ROOT = 'clubs/patka';
