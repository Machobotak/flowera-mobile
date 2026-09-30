/**
 * Validasi input auth (email & password) — dipakai screens `/login` dan
 * `/register`. Pesan error sengaja dibuat persis dengan UX web base.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const normalized = email.trim();
  if (normalized.length === 0) return 'Email wajib diisi';
  if (!EMAIL_REGEX.test(normalized)) return 'Format email tidak valid';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'Password wajib diisi';
  if (password.length < PASSWORD_MIN_LENGTH) return 'Password minimal 8 karakter';
  return null;
}
