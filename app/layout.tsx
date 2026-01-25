import type { Metadata } from 'next'
import { ToastProvider } from './components/shared/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import QueryProvider from './providers/QueryProvider'

export const metadata: Metadata = {
  title: 'NovelForge - AI-Powered Novel Writing',
  description: 'Transform your story ideas into professionally crafted novels with AI assistance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#F8FAFC',
        color: '#1A1A2E'
      }}>
        <QueryProvider>
          <ErrorBoundary>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  )
}
