import type { Metadata, Viewport } from 'next'
import { ToastProvider } from './components/shared/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import QueryProvider from './providers/QueryProvider'
import MobileNavigation from './components/MobileNavigation'
import './styles/responsive.css'

export const metadata: Metadata = {
  title: 'NovelForge - AI-Powered Novel Writing',
  description: 'Transform your story ideas into professionally crafted novels with AI assistance',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NovelForge',
  },
  applicationName: 'NovelForge',
  keywords: ['novel', 'writing', 'AI', 'story', 'author', 'fiction', 'book'],
  authors: [{ name: 'NovelForge' }],
  creator: 'NovelForge',
  publisher: 'NovelForge',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#667eea',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NovelForge" />

        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('SW registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#F8FAFC',
        color: '#1A1A2E'
      }}>
        <QueryProvider>
          <ErrorBoundary>
            <ToastProvider>
              <MobileNavigation>
                {children}
              </MobileNavigation>
            </ToastProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  )
}
