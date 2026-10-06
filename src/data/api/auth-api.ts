/**
 * Service auth Flowera API — satu-satunya modul yang tahu endpoint dan bentuk
 * response `/api/auth/*` (kontrak diambil dari
 * `flowera-api/src/auth/auth.controller.ts` + `src/auth/dto/*.dto.ts`):
 *
 *   POST /auth/register { name, phone_number, email, password }
 *       201 { status, message, accessToken, refreshToken }
 *   POST /auth/login    { email, password }
 *       200 { status, message, accessToken, refreshToken }
 *   GET  /auth/me       200 { id, name, email, avatar, roles }
 *   POST /auth/logout   200 { message }
 *   POST /auth/refresh  (dipakai manual saja — lihat catatan di bawah)
 *
 * Response JSON dipetakan ke model UI (`PublicUser`) di sini, bukan di
 * component, sesuai konsep Task 03 (response → parse → mapping → UI).
 *
 * CATATAN refresh token: `POST /auth/refresh` ada di backend, tetapi saat
 * integrasi ini diuji endpoint-nya SELALU membalas 403
 * "Refresh token tidak valid" walau cookie/refresh token yang dikirim cocok
 * dengan hash di database (diverifikasi bcrypt.compare = true). Karena itu
 * aplikasi tidak memasang auto-refresh berbasis endpoint tersebut; kalau
 * access token (15 menit) kedaluwarsa, user diminta login ulang.
 */

import { api, setAuthTokens, type AuthTokens } from './client';
import { logApiError, toUserMessage } from './errors';
import type { LoginInput, PublicUser, RegisterInput } from '@/data/auth/types';

interface AuthTokensResponse {
  status: string;
  message: string;
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  roles: string[] | null;
}

export interface AuthSession {
  tokens: AuthTokens;
  user: PublicUser;
}

/* ──────────────────────────── Mapping ──────────────────────────── */

/** JSON `/auth/me` → `PublicUser` yang dipakai UI. */
export function mapMeResponse(payload: MeResponse): PublicUser {
  return {
    id: payload.id,
    name: payload.name ?? '',
    email: payload.email ?? '',
    avatar: payload.avatar ?? null,
    roles: payload.roles ?? ['user'],
  };
}

/** Validasi sesi saat app dibuka / ambil user yang sedang login (`GET /auth/me`). */
export async function fetchCurrentUser(): Promise<PublicUser> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return mapMeResponse(data);
}

/* ──────────────────────────── Public API ──────────────────────────── */

/** `POST /auth/login` → token dipasang di client, profil diambil dari `/auth/me`. */
export async function login(input: LoginInput): Promise<AuthSession> {
  try {
    const { data } = await api.post<AuthTokensResponse>('/auth/login', input);
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    setAuthTokens(tokens);

    return { tokens, user: await fetchCurrentUser() };
  } catch (error) {
    setAuthTokens(null);
    logApiError('login', error);
    throw new Error(toUserMessage(error, 'Login gagal. Silakan coba lagi.'));
  }
}

/**
 * `POST /auth/register`. Backend otomatis memberi sesi (cookie + token), tapi
 * alur Task 03 meminta user diarahkan ke halaman Login, jadi sesi hasil
 * register langsung dibuang agar tidak ada sesi menggantung.
 */
export async function register(input: RegisterInput): Promise<void> {
  try {
    const { data } = await api.post<AuthTokensResponse>('/auth/register', input);
    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  } catch (error) {
    logApiError('register', error);
    throw new Error(
      toUserMessage(error, 'Registrasi gagal. Silakan coba lagi.'),
    );
  }

  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Gagal membersihkan sesi server tidak membatalkan registrasi yang sudah
    // berhasil; token lokal tetap dibuang.
    logApiError('register:cleanup-session', error);
  } finally {
    setAuthTokens(null);
  }
}

/** `POST /auth/logout` — best-effort, error jaringan bukan blocker logout lokal. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    logApiError('logout', error);
  }
}
