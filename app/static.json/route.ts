import { source } from '@/lib/source';
import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { getSection } from '@/lib/source/navigation';

export const revalidate = false;

type DocsStaticData = {
  load?: () => Promise<{ structuredData?: unknown }>;
  structuredData?: unknown;
};

export async function GET(): Promise<Response> {
  const pages = source.getPages();
  const promises = pages.map(async (page) => {
    if (page.data.type === 'openapi') return;

    const items = getBreadcrumbItems(page.url, source.getPageTree(), {
      includePage: false,
      includeRoot: true,
    });

    const data = page.data as unknown as DocsStaticData;
    const loaded = typeof data.load === 'function' ? await data.load() : data;

    return {
      id: page.url,
      structured: loaded.structuredData,
      tag: getSection(page.slugs[0]),
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      breadcrumbs: items.flatMap<string>((item, i) =>
        i > 0 && typeof item.name === 'string' ? item.name : [],
      ),
    } as OramaDocument;
  });

  return Response.json(
    (await Promise.all(promises)).filter((v) => v !== undefined) as OramaDocument[],
  );
}
