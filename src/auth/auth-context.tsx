/**
 * Auth context Flowera — state user & session di seluruh app.
 *
 * Padanan `contexts/auth-context.tsx` web tanpa axios: register/login hanya
 * membaca/menulis store lokal (`src/data/auth/users.ts` + `src/auth/session-storage.ts`).
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type {
  LoginInput,
  PublicUser,
  RegisterInput,
} from '@/data/auth/types';
import { createUser, verifyCredentials } from '@/data/auth/users';
import { normalizeEmail } from '@/data/auth/validation';
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

    getSession()
      .then((session) => {
        if (!active) return;
        if (session) {
          setUser({
            id: session.userId,
            name: session.name,
            email: session.email,
            createdAt: session.issuedAt,
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (input: LoginInput): Promise<void> => {
    const email = normalizeEmail(input.email);
    const result = await verifyCredentials({ email, password: input.password });

    if ('error' in result) {
      if (result.error === 'not_found') {
        throw new Error('Akun tidak ditemukan');
      }
      throw new Error('Password salah');
    }

    const session = {
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      issuedAt: new Date().toISOString(),
    };
    await setSession(session);
    setUser(result.user);
  };

  const register = async (input: RegisterInput): Promise<void> => {
    await createUser(input);
    // Sesuai alur: register sukses → redirect ke /login, tidak auto-login.
  };

  const logout = async (): Promise<void> => {
    await clearSession();
    setUser(null);
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
