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
 *   - `Authorization: Bearer <accessToken>` — dibaca `JwtAuthGuard` dan
 *     strategi passport (`jwt-access.strategy.ts`, `jwt-refresh.strategy.ts`).
 *     Ini jalur yang dipakai web: browser menolak `Cookie` manual, dan cookie
 *     httpOnly dari API (origin lain, `SameSite=Lax`) tidak ikut terkirim.
 *   - `Cookie: accessToken=...; refreshToken=...` (khusus native).
 */
/**
 * Base URL file upload MinIO (mis. `http://host:9000/flowera`).
 *
 * Backend menyimpan `image_url`/`STORE.LOGO` sebagai path relatif ke bucket
 * (`/products/x.jpg`, `stores/x.jpg`), bukan ke API NestJS. Web memakai
 * `NEXT_PUBLIC_ACCESS_FILE_STORAGE`; mobile memakai env gitignored
 * `EXPO_PUBLIC_STORAGE_BASE_URL`. Kalau belum diisi, jatuh ke `API_BASE_URL`
 * supaya tetap ada URL (walau gambar tidak akan tampil).
 */
export const STORAGE_BASE_URL = (
  process.env.EXPO_PUBLIC_STORAGE_BASE_URL ?? API_BASE_URL
).replace(/\/+$/, '');

/** Path objek MinIO → URL absolut. */
export function resolveStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  return `${STORAGE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}


import { create, type AxiosInstance } from 'axios';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://192.168.14.219:3000';

/** Base URL tanpa trailing slash. */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

/**
 * Ubah path upload relatif dari backend (mis. `/uploads/produk.jpg`) menjadi
 * URL absolut. URL yang sudah absolut dibiarkan apa adanya.
 */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

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
