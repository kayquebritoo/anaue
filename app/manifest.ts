// ============================================================
// app/manifest.ts
// Web App Manifest para PWA (Progressive Web App) do Anauê Amazônia
// ============================================================

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Anauê Amazônia — Sítio Ecológico & PMS',
    short_name: 'Anauê Amazônia',
    description: 'Refúgio ecológico de luxo e hospitalidade sustentável no coração da Amazônia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060f0a',
    theme_color: '#0d1f14',
    icons: [
      {
        src: '/images/logo/icon-white.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/images/logo/icon-white.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
