import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'QR Generator - OneSign & Digital',
  description: 'Generate print-ready QR codes that never break. Create managed links that can be updated without reprinting.',
  keywords: ['QR code', 'QR generator', 'OneSign', 'managed links', 'print QR'],
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
