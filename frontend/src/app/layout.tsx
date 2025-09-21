import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cookieToInitialState } from 'wagmi';
import { headers } from 'next/headers';
import { wagmiConfig } from '@/lib/wagmi';
import { APP_METADATA } from '@/lib/constants';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_METADATA.name,
  description: APP_METADATA.description,
  icons: {
    icon: APP_METADATA.icons,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize state from cookies for SSR
  const initialState = cookieToInitialState(
    wagmiConfig,
    (await headers()).get('cookie'),
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers initialState={initialState}>
            <div className="min-h-screen bg-background">
              {children}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}