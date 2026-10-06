/**
 * Auth context Flowera — state user & sesi di seluruh app, sumbernya Flowera API.
 *
 * Alur mengikuti backend `flowera-api` (parity dengan
 * `contexts/auth-context.tsx` di web Flowera, tanpa axios terpisah):
 *   login    → POST /api/auth/login → pasang token → GET /api/auth/me → simpan profil
 *   register → POST /api/auth/register (sukses → user diarahkan ke /login)
 *   boot     → baca session tersimpan, lalu validasi ulang lewat GET /api/auth/me
 *   logout   → bersihkan state lokal, lalu POST /api/auth/logout (best-effort)
 *
 * Password tidak pernah disimpan; yang persist hanya token + profil publik
 * (`src/auth/session-storage.ts`).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/data/api/auth-api';
import { setAuthTokens } from '@/data/api/client';
import { isUnauthorizedError, logApiError } from '@/data/api/errors';
import type { LoginInput, PublicUser, RegisterInput } from '@/data/auth/types';
import { normalizeEmail, normalizePhoneNumber } from '@/data/auth/validation';
import {
  clearSession,
  getSession,
  setSession,
} from '@/auth/session-storage';

interface AuthContextType {
  user: PublicUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async (): Promise<void> => {
      const session = await getSession();
      if (!session) return;

      setAuthTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });

      // Tampilkan dulu profil tersimpan, lalu sinkronkan dengan backend.
      if (active) setUser(session.user);

      try {
        const current = await fetchCurrentUser();
        if (!active) return;
        setUser(current);
        await setSession({ ...session, user: current });
      } catch (error) {
        logApiError('restore-session', error);
        if (isUnauthorizedError(error)) {
          // Token/cookie sudah tidak berlaku → paksa login ulang.
          setAuthTokens(null);
          await clearSession();
          if (active) setUser(null);
        }
        // Error jaringan: biarkan sesi tersimpan supaya app tetap terbuka.
      }
    };

    restoreSession()
      .catch((error) => logApiError('restore-session', error))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (input: LoginInput): Promise<void> => {
    const session = await loginRequest({
      email: normalizeEmail(input.email),
      password: input.password,
    });

    await setSession({
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
      user: session.user,
      issuedAt: new Date().toISOString(),
    });
    setUser(session.user);
  };

  const register = async (input: RegisterInput): Promise<void> => {
    await registerRequest({
      name: input.name.trim(),
      phone_number: normalizePhoneNumber(input.phone_number),
      email: normalizeEmail(input.email),
      password: input.password,
    });
    // Sesuai alur: register sukses → redirect ke /login, tidak auto-login.
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    try {
      await logoutRequest();
    } finally {
      setAuthTokens(null);
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
