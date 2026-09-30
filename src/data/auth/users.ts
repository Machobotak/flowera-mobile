/**
 * Repository user prototype Flowera — penyimpanan local-only di AsyncStorage.
 *
 * Belum ada backend/database sungguhan; array `UserRecord` di-JSON-stringify ke
 * satu key `flowera:users`. Password tidak pernah disimpan plaintext: disimpan
 * sebagai SHA-256 dari `${salt}:${password}` dengan salt acak per user.
 *
 * `ensureSeeded()` membuat akun demo `demo@flowera.id` saat store kosong supaya
 * login bisa dicoba tanpa register dulu.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { normalizeEmail } from '@/data/auth/validation';
import type {
  LoginInput,
  PublicUser,
  RegisterInput,
  UserRecord,
} from '@/data/auth/types';

const USERS_KEY = 'flowera:users';

/* ──────────────────────────── Hashing ──────────────────────────── */

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

async function newSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ──────────────────────────── Store ──────────────────────────── */

async function loadUsers(): Promise<UserRecord[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return [];
  }
}

async function saveUsers(users: UserRecord[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function ensureSeeded(): Promise<void> {
  const users = await loadUsers();
  if (users.length > 0) return;

  const salt = await newSalt();
  const passwordHash = await hashPassword('Flowera123!', salt);
  const demo: UserRecord = {
    id: Crypto.randomUUID(),
    name: 'Demo User',
    email: 'demo@flowera.id',
    passwordSalt: salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await saveUsers([demo]);
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function toPublicUser(record: UserRecord): PublicUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    createdAt: record.createdAt,
  };
}

/* ──────────────────────────── Public API ──────────────────────────── */

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | undefined> {
  await ensureSeeded();
  const users = await loadUsers();
  return users.find((u) => u.email === normalizeEmail(email));
}

export async function createUser(input: RegisterInput): Promise<PublicUser> {
  await ensureSeeded();
  const email = normalizeEmail(input.email);

  const users = await loadUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error('Email sudah terdaftar');
  }

  const salt = await newSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const record: UserRecord = {
    id: Crypto.randomUUID(),
    name: input.name.trim(),
    email,
    passwordSalt: salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  await saveUsers(users);

  return toPublicUser(record);
}

export async function verifyCredentials(
  input: LoginInput,
): Promise<{ user: PublicUser } | { error: 'not_found' | 'wrong_password' }> {
  await ensureSeeded();
  const email = normalizeEmail(input.email);
  const users = await loadUsers();
  const user = users.find((u) => u.email === email);

  if (!user) return { error: 'not_found' };

  const hash = await hashPassword(input.password, user.passwordSalt);
  if (hash !== user.passwordHash) return { error: 'wrong_password' };

  return { user: toPublicUser(user) };
}
