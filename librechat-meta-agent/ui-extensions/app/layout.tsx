import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Inter font - optimized for screens, perfect for minimalist UI
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Meta Agent - AI-Powered Assistant',
  description: 'The most advanced AI assistant with Extended Thinking, Deep Research, Image/Video Generation, Voice Chat, Computer Use, and more.',
  manifest: '/manifest.json',
  applicationName: 'Meta Agent',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Meta Agent',
    startupImage: [
      {
        url: '/splash-2048x2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash-1668x2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash-1536x2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash-1284x2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Meta Agent',
    title: 'Meta Agent - AI-Powered Assistant',
    description: 'The most advanced AI assistant with Extended Thinking, Deep Research, and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meta Agent - AI-Powered Assistant',
    description: 'The most advanced AI assistant with Extended Thinking, Deep Research, and more.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F10' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/* PWA Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png" />

        {/* Mobile Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Windows Tile - Night-Light Teal */}
        <meta name="msapplication-TileColor" content="#0B0F10" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Disable automatic detection of phone numbers */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color - Dark mode default */}
        <meta name="theme-color" content="#0B0F10" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F8FAFA" media="(prefers-color-scheme: light)" />

        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('meta-agent-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased overscroll-none font-sans" style={{ backgroundColor: 'var(--bg-0)', color: 'var(--text-primary)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
