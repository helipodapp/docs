import { type OramaDocument, sync } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import { DataSourceId, isAdmin, orama } from '@/lib/orama/client';

export async function updateSearchIndexes(): Promise<void> {
  if (!isAdmin) {
    // Index sync is optional when admin credentials are not configured.
    return;
  }

  const content = await fs.readFile('.next/server/app/static.json.body');
  const records = JSON.parse(content.toString()) as OramaDocument[];

  try {
    await sync(orama, {
      index: DataSourceId,
      documents: records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Orama free tier can reject large syncs with HTTP 402 document limits.
    // Search indexing is optional and should not break the production build.
    if (message.includes('status 402') || message.includes('Document limit exceeded')) {
      console.warn(`[orama] skipped index sync: ${message}`);
      return;
    }

    throw error;
  }

  console.log(`search updated: ${records.length} records`);
}
