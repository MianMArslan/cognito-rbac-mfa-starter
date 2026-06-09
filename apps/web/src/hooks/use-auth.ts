'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionUser, getAccessToken, clearSession } from '@/lib/session';
import type { AuthenticatedUser } from '@repo/shared-types';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  });

  useEffect(() => {
    const user = getSessionUser();
    const accessToken = getAccessToken();
    setState({ user, accessToken, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
    clearSession();
    router.push('/login');
  }, [router]);

  return { ...state, logout };
}
