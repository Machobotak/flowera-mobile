/**
 * HTTP client terpusat Flowera API (NestJS, global prefix `/api`).
 *
 * Semua request ke backend harus lewat instance `api` ini supaya base URL,
 * credentials, dan header auth konsisten — URL backend tidak ditulis ulang
 * di component (nilainya dari `.env`, lihat `EXPO_PUBLIC_API_BASE_URL`).
 *
 * Mekanisme auth backend (`flowera-api/src/auth/auth.controller.ts`):
 * token dikirim di body JSON (`accessToken`, `refreshToken`) DAN diset sebagai
 * cookie httpOnly. Cookie jar native tidak dijamin bertahan lintas restart
 * aplikasi, jadi token juga dikirim ulang sebagai header:
 *   - `Authorization: Bearer <accessToken>` — dibaca strategi passport
 *     (`jwt-access.strategy.ts`, `jwt-refresh.strategy.ts`, `jwt-auth.guard.ts`).
 *   - `Cookie: accessToken=...; refreshToken=...` (khusus native) — dibutuhkan
 *     endpoint yang guard-nya hanya membaca cookie (`JwtAuthGuard`):
 *     `GET /auth/me` dan `POST /auth/logout`.
 * Di web header `Cookie` dilarang browser, tapi cookie httpOnly tetap ikut
 * terkirim otomatis karena `withCredentials: true`.
 */

import { create, type AxiosInstance } from 'axios';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

/** Base URL tanpa trailing slash. */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

let tokens: AuthTokens | null = null;

/**
 * Simpan token di memori (bukan secure store) supaya interceptor bisa
 * menyisipkan header secara sinkron. Persistensinya ditangani
 * `src/auth/session-storage.ts`.
 */
export function setAuthTokens(next: AuthTokens | null): void {
  tokens = next;
}

export const api: AxiosInstance = create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (!tokens) return config;

  config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  if (Platform.OS !== 'web') {
    config.headers.Cookie = `accessToken=${tokens.accessToken}; refreshToken=${tokens.refreshToken}`;
  }

  return config;
});
