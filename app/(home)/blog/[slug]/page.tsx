import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import type { TOCItemType } from 'fumadocs-core/toc';
import { blog } from '@/lib/source';
import { createMetadata } from '@/lib/metadata';
import { buttonVariants } from '@/components/ui/button';
import { ShareButton } from '@/app/(home)/blog/[slug]/page.client';
import { getMDXComponents } from '@/components/mdx';
import path from 'node:path';
import { cn } from '@/lib/cn';

type LoadedBlogData = {
  body: ComponentType<{ components?: ReturnType<typeof getMDXComponents> }>;
  toc?: TOCItemType[];
};

type BlogFrontmatter = {
  author?: string;
  date?: string | Date;
};

export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);
  const components = getMDXComponents();

  if (!page) notFound();

  const pageData = page.data as unknown as Record<string, unknown>;
  const loadedData =
    typeof pageData.load === 'function'
      ? await (pageData.load as () => Promise<LoadedBlogData>)()
      : (pageData as unknown as LoadedBlogData);

  const Mdx = loadedData.body;
  const toc = Array.isArray(loadedData.toc) ? loadedData.toc : [];
  const frontmatter = page.data as BlogFrontmatter;

  return (
    <article className="flex flex-col mx-auto w-full max-w-200 px-4 py-8">
      <div className="flex flex-row gap-4 text-sm mb-8">
        <div>
          <p className="mb-1 text-fd-muted-foreground">Written by</p>
          <p className="font-medium">{frontmatter.author ?? 'Unknown'}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-fd-muted-foreground">At</p>
          <p className="font-medium">
            {new Date(
              frontmatter.date ?? path.basename(page.path, path.extname(page.path)),
            ).toDateString()}
          </p>
        </div>
      </div>

      <h1 className="text-3xl font-semibold mb-4">{page.data.title}</h1>
      <p className="text-fd-muted-foreground mb-8">{page.data.description}</p>

      <div className="prose min-w-0 flex-1">
        <div className="flex flex-row gap-2 mb-8 not-prose">
          <ShareButton url={page.url} />
          <Link
            href="/blog"
            className={cn(
              buttonVariants({
                size: 'sm',
                variant: 'secondary',
              }),
            )}
          >
            Back
          </Link>
        </div>

        <InlineTOC items={toc} />
        <Mdx components={components} />
      </div>
    </article>
  );
}

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  return createMetadata({
    title: page.data.title,
    description: page.data.description ?? 'The library for building documentation sites',
  });
}

export function generateStaticParams(): { slug: string }[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
