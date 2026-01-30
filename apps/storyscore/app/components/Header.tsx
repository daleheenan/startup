'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { isAuthenticated, logout, getUser } from '../lib/auth';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuth(isAuthenticated());
    const user = getUser();
    setUserName(user?.name || null);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  const isActivePath = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-slate-700/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-centre">
            <Link href="/" className="flex items-centre space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-centre justify-centre">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold gradient-text">StoryScore</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-centre space-x-8">
            {isAuth ? (
              <>
                <Link
                  href="/dashboard"
                  className={`transition-colors ${
                    isActivePath('/dashboard')
                      ? 'text-primary-400'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/analyse"
                  className={`transition-colors ${
                    isActivePath('/analyse')
                      ? 'text-primary-400'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  Analyse
                </Link>
                <div className="flex items-centre space-x-4">
                  {userName && (
                    <span className="text-text-secondary text-sm">
                      {userName}
                    </span>
                  )}
                  <button onClick={handleLogout} className="btn-ghost">
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-text-secondary hover:text-text transition-colors"
                >
                  Log In
                </Link>
                <Link href="/register" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-centre">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-text-secondary hover:text-text"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700/50">
            {isAuth ? (
              <div className="space-y-4">
                <Link
                  href="/dashboard"
                  className={`block py-2 ${
                    isActivePath('/dashboard')
                      ? 'text-primary-400'
                      : 'text-text-secondary'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/analyse"
                  className={`block py-2 ${
                    isActivePath('/analyse')
                      ? 'text-primary-400'
                      : 'text-text-secondary'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analyse
                </Link>
                {userName && (
                  <div className="py-2 text-text-secondary text-sm">
                    {userName}
                  </div>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left py-2 text-text-secondary"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Link
                  href="/login"
                  className="block py-2 text-text-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="block btn-primary text-centre"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
