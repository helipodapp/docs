import type { Metadata } from 'next/types';
import { Page } from './source';

export function createMetadata(override: Metadata): Metadata {
  const defaultIcons: NonNullable<Metadata['icons']> = {
    apple: [
      { url: '/assets/apple-icon-57x57.png', sizes: '57x57', type: 'image/png' },
      { url: '/assets/apple-icon-60x60.png', sizes: '60x60', type: 'image/png' },
      { url: '/assets/apple-icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/assets/apple-icon-76x76.png', sizes: '76x76', type: 'image/png' },
      { url: '/assets/apple-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/assets/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/assets/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/assets/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/assets/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    icon: [
      { url: '/assets/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/assets/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/assets/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  };

  const defaultOther: NonNullable<Metadata['other']> = {
    'msapplication-TileColor': '#0A0A0A',
    'msapplication-TileImage': '/assets/ms-icon-144x144.png',
  };

  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://sitlabs.id',
      images: '/banner.webp',
      siteName: 'SIT Labs',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@sitlabs',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/banner.webp',
      ...override.twitter,
    },
    alternates: {
      types: {
        'application/rss+xml': [
          {
            title: 'SIT Labs Blog',
            url: 'https://sitlabs.id/blog/rss.xml',
          },
        ],
      },
      ...override.alternates,
    },
    icons: override.icons ?? defaultIcons,
    manifest: override.manifest ?? '/assets/manifest.json',
    other: {
      ...defaultOther,
      ...override.other,
    },
  };
}

export function getPageImage(page: Page) {
  const segments = [...page.slugs, 'image.webp'];

  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}

export const baseUrl =
  (() => {
    const raw =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL;

    if (!raw) return new URL('http://localhost:3000');

    const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;

    return new URL(normalized);
  })();
