/**
 * Tipe profil user — mengikuti `flowera-api/src/user/profile`:
 *
 *   GET /api/user/profile/detail → { status, data: { no_hp, birth_place,
 *                                   birth_date, gender } }
 *   PUT /api/user/profile/update ← ProfileUpdateDto (semua field opsional,
 *                                   birth_date harus ISO date string)
 *
 * Nama/email/avatar bukan bagian dari endpoint ini; sumbernya `/api/auth/me`.
 */

export interface ProfileDetail {
  no_hp: string | null;
  birth_place: string | null;
  birth_date: string | null;
  gender: string | null;
}

export interface UpdateProfileInput {
  no_hp?: string;
  birth_place?: string;
  birth_date?: string;
  gender?: string;
}
