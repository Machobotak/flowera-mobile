/**
 * Session store Flowera — token auth + identitas user yang sedang login.
 *
 * Native (iOS/Android) memakai `expo-secure-store` (Keychain/Keystore).
 * Isi session: accessToken + refreshToken dari response `/api/auth/login` dan
 * profil publik (`PublicUser` hasil `GET /api/auth/me`). Password tidak pernah
 * disimpan.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { PublicUser } from '@/data/auth/types';

const SESSION_KEY = 'flowera.session';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
  issuedAt: string; // ISO
}

/* ──────────────────────────── Parse ──────────────────────────── */

/**
 * Validasi isi session tersimpan sebelum dipakai. Perlu karena data lama di
 * SecureStore/localStorage bisa berasal dari format sebelumnya
 * (`{ userId, name, email, issuedAt }` tanpa token).
 */
function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  if (!('accessToken' in parsed) || typeof parsed.accessToken !== 'string') return null;
  if (!('refreshToken' in parsed) || typeof parsed.refreshToken !== 'string') return null;
  if (!('user' in parsed) || !parsed.user || typeof parsed.user !== 'object') return null;
  if (!('email' in parsed.user) || typeof parsed.user.email !== 'string') return null;
  if (!('id' in parsed.user) || typeof parsed.user.id !== 'number') return null;

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    user: {
      id: parsed.user.id,
      name: 'name' in parsed.user && typeof parsed.user.name === 'string' ? parsed.user.name : '',
      email: parsed.user.email,
      avatar: 'avatar' in parsed.user && typeof parsed.user.avatar === 'string' ? parsed.user.avatar : null,
      roles:
        'roles' in parsed.user && Array.isArray(parsed.user.roles)
          ? parsed.user.roles.filter((role): role is string => typeof role === 'string')
          : ['user'],
    },
    issuedAt: 'issuedAt' in parsed && typeof parsed.issuedAt === 'string' ? parsed.issuedAt : new Date().toISOString(),
  };
}

/* ──────────────────────────── Native (secure) ──────────────────────────── */

async function readNative(): Promise<StoredSession | null> {
  return parseSession(await SecureStore.getItemAsync(SESSION_KEY));
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
  return parseSession(globalThis.localStorage.getItem(SESSION_KEY));
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
