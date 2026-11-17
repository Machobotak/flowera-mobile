/**
 * Service profil Flowera API (`/api/user/profile`).
 * Backend mengembalikan 200 dengan data kosong kalau profil belum pernah
 * dibuat, jadi tidak ada alur 404 yang perlu ditangani di UI.
 */

import { api } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';

import type { ProfileDetail, UpdateProfileInput } from './types';

interface ProfileDetailResponse {
  status: string;
  data: Partial<ProfileDetail> | null;
}

/** Nilai kosong/placeholder backend (`"-"`) dianggap belum diisi. */
function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed === '-' ? null : trimmed;
}

export async function getProfileDetail(): Promise<ProfileDetail> {
  try {
    const { data } = await api.get<ProfileDetailResponse>(
      '/user/profile/detail',
    );
    const detail = data.data ?? {};

    return {
      no_hp: toText(detail.no_hp),
      birth_place: toText(detail.birth_place),
      birth_date: toText(detail.birth_date),
      gender: toText(detail.gender),
    };
  } catch (error) {
    logApiError('profile:detail', error);
    throw new Error(toUserMessage(error, 'Gagal memuat profil.'));
  }
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<void> {
  try {
    await api.put('/user/profile/update', input);
  } catch (error) {
    logApiError('profile:update', error);
    throw new Error(toUserMessage(error, 'Gagal menyimpan profil.'));
  }
}
