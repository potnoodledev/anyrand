/**
 * Root Layout
 *
 * The root layout component for the Next.js application.
 * Sets up global providers, metadata, and base styling.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';
import ErrorBoundary from '../components/ErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anyrand - Verifiable Randomness',
  description: 'Decentralized verifiable randomness for smart contracts using Drand network',
  keywords: ['randomness', 'blockchain', 'smart contracts', 'drand', 'verifiable', 'decentralized'],
  authors: [{ name: 'Anyrand Team' }],
  creator: 'Anyrand',
  publisher: 'Anyrand',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anyrand.io',
    title: 'Anyrand - Verifiable Randomness',
    description: 'Decentralized verifiable randomness for smart contracts using Drand network',
    siteName: 'Anyrand',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Anyrand - Verifiable Randomness',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anyrand - Verifiable Randomness',
    description: 'Decentralized verifiable randomness for smart contracts using Drand network',
    images: ['/og-image.png'],
    creator: '@anyrand',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.drand.sh" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

        {/* PWA support */}
        <meta name="application-name" content="Anyrand" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Anyrand" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Analytics (if needed) */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `,
              }}
            />
          </>
        )}
      </head>

      <body className={inter.className}>
        <ErrorBoundary
          showErrorDetails={process.env.NODE_ENV === 'development'}
          onError={(error, errorInfo) => {
            // Log errors in production to monitoring service
            if (process.env.NODE_ENV === 'production') {
              console.error('Application error:', error, errorInfo);
              // Send to error monitoring service (e.g., Sentry, Bugsnag)
            }
          }}
        >
          <Providers>
            <div className="min-h-screen bg-background font-sans antialiased">
              <div className="relative flex min-h-screen flex-col">
                <main className="flex-1">
                  {children}
                </main>

                {/* Footer */}
                <footer className="border-t">
                  <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>© 2024 Anyrand. All rights reserved.</span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <a
                          href="https://docs.anyrand.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Documentation
                        </a>
                        <a
                          href="https://github.com/anyrand"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          GitHub
                        </a>
                        <a
                          href="https://discord.gg/anyrand"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Discord
                        </a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </Providers>
        </ErrorBoundary>

        {/* Development tools */}
        {process.env.NODE_ENV === 'development' && (
          <div id="development-tools" />
        )}
      </body>
    </html>
  );
}