import { source } from '@/lib/source';
import type { Graph } from '@/components/graph-view';

type GraphPageData = {
  load?: () => Promise<{ extractedReferences?: Array<{ href: string }> }>;
  extractedReferences?: Array<{ href: string }>;
  title?: string;
  description?: string;
};

function fallbackTitle(url: string): string {
  const segment = url.split('/').filter(Boolean).pop();
  return segment ?? 'Untitled';
}

export async function buildGraph(): Promise<Graph> {
  const graph: Graph = { links: [], nodes: [] };

  await Promise.all(
    source.getPages().map(async (page) => {
      if (page.data.type === 'openapi') return;

      const data = page.data as unknown as GraphPageData;

      graph.nodes.push({
        id: page.url,
        url: page.url,
        text: data.title ?? fallbackTitle(page.url),
        description: data.description,
      });

      const loaded = typeof data.load === 'function' ? await data.load() : data;
      const extractedReferences = loaded.extractedReferences ?? [];
      for (const ref of extractedReferences) {
        const refPage = source.getPageByHref(ref.href);
        if (!refPage) continue;

        graph.links.push({
          source: page.url,
          target: refPage.page.url,
        });
      }
    }),
  );

  return graph;
}
