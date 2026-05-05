import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Alphatrades — Binary Options Trading',
  description: 'Trade volatility indices with precision. Built for Kenya.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#070d1a] text-white font-body antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1526',
              color: '#fff',
              border: '1px solid #1a2235',
              borderRadius: '8px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#00C48C', secondary: '#0d1526' },
            },
            error: {
              iconTheme: { primary: '#FF4757', secondary: '#0d1526' },
            },
          }}
        />
      </body>
    </html>
  )
}
