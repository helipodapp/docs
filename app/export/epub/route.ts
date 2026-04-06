import { loader } from 'fumadocs-core/source';
import { exportEpub } from 'fumadocs-epub';
import { docs } from 'collections/server';

export const revalidate = false;

const epubSource = loader(docs.toFumadocsSource(), {
  baseUrl: '/',
});

type EpubPageData = {
  getText?: (kind: 'raw') => Promise<string>;
};

export async function GET(): Promise<Response> {
  const buffer = await exportEpub({
    source: epubSource,
    getMarkdown(page) {
      const data = page.data as EpubPageData;
      return data.getText?.('raw');
    },
    title: 'Helipod Documentation',
    author: 'Fuma Nama',
    description: 'Documentation for Helipod - the all-in-one documentation framework',
    cover: '/og.png',
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="helipod-docs.epub"',
    },
  });
}
