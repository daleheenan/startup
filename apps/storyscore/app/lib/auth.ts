// Authentication utilities for StoryScore

const TOKEN_KEY = 'storyscore_auth_token';
const USER_KEY = 'storyscore_user';

export interface User {
  id: string;
  email: string;
  name?: string;
}

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Store user data in localStorage
 */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Log in user
 */
export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Login failed' } }));
    throw new Error(error.error?.message || 'Login failed');
  }

  const data = await response.json();
  setToken(data.token);
  setUser(data.user);
  return data;
}

/**
 * Register new user
 */
export async function register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Registration failed' } }));
    throw new Error(error.error?.message || 'Registration failed');
  }

  const data = await response.json();
  setToken(data.token);
  setUser(data.user);
  return data;
}

/**
 * Log out user
 */
export function logout(): void {
  removeToken();
}
