// Authentication utilities for NovelForge

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'novelforge_token';

/**
 * Login with password
 */
export async function login(password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const { token } = await response.json();
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Logout (clear token)
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem(TOKEN_KEY);

  // BUG-007 FIX: Validate token before returning
  if (token && isTokenExpired(token)) {
    console.warn('Token is expired, clearing it');
    logout();
    return null;
  }

  return token;
}

/**
 * BUG-007 FIX: Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    // Parse JWT token (format: header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Invalid token format
    }

    // Decode payload (Base64URL)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration (exp is in seconds)
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    }

    // No expiration claim - treat as valid
    return false;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // If we can't parse it, treat as expired
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Verify token with backend
 */
export async function verifyToken(): Promise<boolean> {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logout();
      return false;
    }

    const result = await response.json();
    return result.valid;
  } catch (error) {
    console.error('Token verification failed:', error);
    logout();
    return false;
  }
}
