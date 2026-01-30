'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/auth';

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(true); // Optimistically render to avoid hydration mismatch

  useEffect(() => {
    setIsMounted(true);
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);

    if (!authenticated) {
      router.push('/login');
    }
  }, [router]);

  // Always render children during SSR and initial client render
  // This prevents hydration mismatches
  if (!isMounted || isAuth) {
    return <>{children}</>;
  }

  // Only show nothing after mount if not authenticated
  // (user will be redirected by the useEffect above)
  return null;
}
