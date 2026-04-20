import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OneSign – Lynx',
    short_name: 'Lynx',
    description:
      'Business presence platform — bio pages, QR codes, NFC merchandise, review funnels.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#58a386',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
