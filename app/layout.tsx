import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anaueamazonia.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Anauê Amazônia · Refúgio e Hospedagem',
  description:
    'Viva uma experiência inesquecível na Amazônia. Reserve seu bangalô, chalé ou suíte no Anauê Amazônia, um refúgio ecológico de luxo na floresta.',
  keywords: ['amazônia', 'ecoturismo', 'bangalô', 'reserva', 'natureza', 'luxury', 'pms'],
  icons: {
    icon: [
      { url: '/images/logo/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Anauê Amazônia',
    description: 'Explore nosso refúgio na Amazônia.',
    url: siteUrl,
    siteName: 'Anauê Amazônia',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anauê Amazônia',
    description: 'Explore nosso refúgio na Amazônia.',
    images: ['/images/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body className="bg-forest-950 text-white antialiased overflow-x-hidden">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
