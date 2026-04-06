import { Feed } from 'feed';
import { blog } from '@/lib/source';
import { NextResponse } from 'next/server';

export const revalidate = false;

const baseUrl = 'https://fumadocs.dev';

function getFrontmatter(data: unknown): { date?: string | Date; author?: string } {
  return data as { date?: string | Date; author?: string };
}

function getFallbackDateFromPath(path: string): string {
  const file = path.split('/').pop() ?? '';
  return file.replace(/\.[^/.]+$/, '');
}

export function GET() {
  const feed = new Feed({
    title: 'Helipod Blog',
    id: `${baseUrl}/blog`,
    link: `${baseUrl}/blog`,
    language: 'en',

    image: `${baseUrl}/banner.webp`,
    favicon: `${baseUrl}/icon.png`,
    copyright: 'All rights reserved 2025, Fuma Nama',
  });

  for (const page of blog.getPages().sort((a, b) => {
    const aData = getFrontmatter(a.data);
    const bData = getFrontmatter(b.data);

    return (
      new Date(bData.date ?? getFallbackDateFromPath(b.path)).getTime() -
      new Date(aData.date ?? getFallbackDateFromPath(a.path)).getTime()
    );
  })) {
    const data = getFrontmatter(page.data);

    feed.addItem({
      id: page.url,
      title: page.data.title ?? getFallbackDateFromPath(page.path),
      description: page.data.description,
      link: `${baseUrl}${page.url}`,
      date: new Date(data.date ?? getFallbackDateFromPath(page.path)),

      author: [
        {
          name: data.author ?? 'Unknown',
        },
      ],
    });
  }

  return new NextResponse(feed.rss2());
}
