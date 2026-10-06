/**
 * Mapping error axios → pesan yang layak ditampilkan ke user.
 *
 * Backend NestJS membalas `{ message, error, statusCode }`; `message`-nya
 * sudah berbahasa Indonesia dan ramah user ("Email sudah terdaftar",
 * "Email atau password salah"), jadi dipakai apa adanya. Detail teknis
 * (AxiosError, status, payload) hanya dicatat ke console untuk debugging.
 */

import { isAxiosError } from 'axios';

export const GENERIC_ERROR_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.';
export const NETWORK_ERROR_MESSAGE =
  'Tidak dapat terhubung ke server Flowera. Periksa koneksi internet kamu.';
export const TIMEOUT_ERROR_MESSAGE =
  'Koneksi ke server Flowera terlalu lama. Coba lagi.';

function messageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return null;
  }

  const raw = payload.message;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;

  // ValidationPipe NestJS bisa mengirim array pesan.
  if (Array.isArray(raw)) {
    const first = raw.find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (first) return first;
  }

  return null;
}

/** True kalau backend menolak karena sesi/token tidak valid. */
export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

/** Pesan aman untuk ditampilkan pada UI (tidak pernah pesan mentah axios). */
export function toUserMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string {
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const fromBackend = messageFromPayload(error.response?.data);
  if (fromBackend) return fromBackend;

  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? TIMEOUT_ERROR_MESSAGE
      : NETWORK_ERROR_MESSAGE;
  }

  switch (error.response.status) {
    case 400:
      return 'Data yang kamu kirim tidak valid.';
    case 401:
      return 'Sesi kamu sudah berakhir. Silakan masuk kembali.';
    case 403:
      return 'Kamu tidak punya akses untuk aksi ini.';
    default:
      return error.response.status >= 500
        ? 'Server Flowera sedang bermasalah. Coba lagi sebentar lagi.'
        : fallback;
  }
}

/** Log detail teknis (status + payload backend) untuk keperluan debugging. */
export function logApiError(scope: string, error: unknown): void {
  if (isAxiosError(error)) {
    console.warn(`[api] ${scope}`, {
      status: error.response?.status,
      data: error.response?.data ?? error.message,
    });
    return;
  }
  console.warn(`[api] ${scope}`, error);
}
