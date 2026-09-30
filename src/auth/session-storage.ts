/**
 * Session store Flowera — identitas user yang sedang login.
 *
 * Native (iOS/Android) memakai `expo-secure-store` (Keychain/Keystore).
 * Session hanya berisi identitas (userId, name, email, issuedAt) dan TIDAK
 * PERNAH menyimpan password/salt/hash.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'flowera.session';

export interface StoredSession {
  userId: string;
  name: string;
  email: string;
  issuedAt: string; // ISO
}

/* ──────────────────────────── Native (secure) ──────────────────────────── */

async function readNative(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

async function writeNative(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function clearNative(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/* ──────────────────────────── Web (prototype) ──────────────────────────── */

/**
 * PROTOTYPE ONLY — `expo-secure-store` throw di web karena tidak ada
 * Keychain/Keystore. Fallback ke localStorage (BUKAN secure) agar auth tetap
 * bisa dicoba di `npm run web`.
 */
async function readWeb(): Promise<StoredSession | null> {
  const raw = globalThis.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

async function writeWeb(session: StoredSession): Promise<void> {
  globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function clearWeb(): Promise<void> {
  globalThis.localStorage.removeItem(SESSION_KEY);
}

/* ──────────────────────────── Public API ──────────────────────────── */

export function getSession(): Promise<StoredSession | null> {
  return Platform.OS === 'web' ? readWeb() : readNative();
}

export function setSession(session: StoredSession): Promise<void> {
  return Platform.OS === 'web' ? writeWeb(session) : writeNative(session);
}

export function clearSession(): Promise<void> {
  return Platform.OS === 'web' ? clearWeb() : clearNative();
}
