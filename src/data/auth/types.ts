/**
 * Tipe auth Flowera — mengikuti kontrak backend, bukan store lokal lagi.
 *
 * Sumber kebenaran: `flowera-api/src/auth/dto/register.dto.ts`,
 * `login.dto.ts`, dan response `GET /auth/me`.
 * Tidak ada password/salt/hash di sini; password hanya lewat begitu saja
 * dari form ke `POST /auth/login|register`.
 */

/** User publik hasil mapping `GET /auth/me`. */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  roles: string[];
}

/** Body `POST /auth/register` (RegisterDto: name, phone_number, email, password). */
export interface RegisterInput {
  name: string;
  phone_number: string;
  email: string;
  password: string;
}

/** Body `POST /auth/login` (LoginDto: email, password). */
export interface LoginInput {
  email: string;
  password: string;
}
