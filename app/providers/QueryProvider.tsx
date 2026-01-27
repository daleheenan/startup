'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { QueryConfig } from '@/app/lib/constants/query-config';

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for configured time
            staleTime: QueryConfig.STALE_TIME_DEFAULT,
            // Cache data for configured time
            gcTime: QueryConfig.GC_TIME_DEFAULT,
            // Retry failed queries up to configured times
            retry: QueryConfig.RETRY_DEFAULT,
            // Don't refetch on window focus in development
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
