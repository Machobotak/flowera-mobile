/**
 * Tipe data user untuk prototype auth lokal Flowera.
 * Belum ada backend — user disimpan di AsyncStorage (`src/data/auth/users.ts`),
 * session disimpan terpisah di secure store (`src/auth/`).
 *
 * `PublicUser` adalah bentuk user tanpa salt/hash dan dipakai untuk
 * context/session; jangan pernah export `UserRecord` penuh keluar modul ini.
 */

/* ──────────────────────────── Types ──────────────────────────── */

export interface UserRecord {
  id: string; // uuid v4 (via Crypto.randomUUID())
  name: string;
  email: string; // selalu lowercase (normalized)
  passwordSalt: string; // hex 32 char
  passwordHash: string; // SHA-256(`${salt}:${password}`)
  createdAt: string; // ISO string
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
