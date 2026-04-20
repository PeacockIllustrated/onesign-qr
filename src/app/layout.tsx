import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const gilroy = localFont({
  src: [
    { path: '../../public/fonts/Gilroy-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/Gilroy-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Gilroy-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Gilroy-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Gilroy-Heavy.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-gilroy',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#58a386',
};

export const metadata: Metadata = {
  title: 'OneSign – Lynx',
  description:
    'Business presence platform. Bio pages, QR codes, NFC merchandise, review funnels — all in one dashboard for UK small businesses.',
  keywords: [
    'OneSign',
    'Lynx',
    'bio page',
    'QR code',
    'NFC',
    'link in bio',
    'small business',
    'review funnel',
  ],
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/onesign-lynx-icon-light.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OneSign – Lynx',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // suppressHydrationWarning is intentional — prevents warnings from
  // browser extensions or theme scripts that modify the <html> element
  // before React hydration. This is standard Next.js practice.
  return (
    <html lang="en" className={gilroy.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
