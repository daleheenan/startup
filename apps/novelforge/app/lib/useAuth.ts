'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, logout as authLogout, verifyToken } from './auth';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

/**
 * Custom hook for managing authentication state in the UI.
 *
 * Provides:
 * - user: The current user object (null if not authenticated)
 * - isLoading: Whether auth state is being determined
 * - isAuthenticated: Boolean indicating auth status
 * - logout: Function to log out the user
 * - refreshAuth: Function to re-check authentication
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      // Verify token and get user info
      const isValid = await verifyToken();
      if (!isValid) {
        setUser(null);
        return;
      }

      // Parse user info from token (JWT payload)
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          setUser({
            id: payload.sub || 'user',
            name: payload.name || 'NovelForge User',
            email: payload.email || 'user@novelforge.app',
          });
        } else {
          // Token doesn't contain user info, use defaults for authenticated user
          setUser({
            id: 'user',
            name: 'NovelForge User',
            email: 'user@novelforge.app',
          });
        }
      } catch {
        // If token parsing fails but token was valid, use defaults
        setUser({
          id: 'user',
          name: 'NovelForge User',
          email: 'user@novelforge.app',
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage events (e.g., logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'novelforge_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshAuth,
  };
}
