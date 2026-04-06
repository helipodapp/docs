import type { MetadataRoute } from 'next';
import { baseUrl } from '@/lib/metadata';
import { source } from '@/lib/source';

export const revalidate = false;

type DocsSitemapData = {
  load?: () => Promise<{ lastModified?: Date | string }>;
  lastModified?: Date | string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string): string => new URL(path, baseUrl).toString();
  const items = await Promise.all(
    source.getPages().map(async (page) => {
      if (page.data.type === 'openapi') return;

      const data = page.data as unknown as DocsSitemapData;
      const loaded = typeof data.load === 'function' ? await data.load() : data;
      const lastModified = loaded.lastModified;

      return {
        url: url(page.url),
        lastModified: lastModified ? new Date(lastModified) : undefined,
        changeFrequency: 'weekly',
        priority: 0.5,
      } as MetadataRoute.Sitemap[number];
    }),
  );

  return [
    // {
    //   url: url('/'),
    //   changeFrequency: 'monthly',
    //   priority: 1,
    // },
    // {
    //   url: url('/showcase'),
    //   changeFrequency: 'monthly',
    //   priority: 0.8,
    // },
    // {
    //   url: url('/'),
    //   changeFrequency: 'monthly',
    //   priority: 0.8,
    // },
    ...items.filter((v) => v !== undefined),
  ];
}
