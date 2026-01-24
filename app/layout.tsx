import type { Metadata } from 'next'

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
        backgroundColor: '#0a0a0a',
        color: '#ededed'
      }}>
        {children}
      </body>
    </html>
  )
}
