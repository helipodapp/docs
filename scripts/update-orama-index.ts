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

  await sync(orama, {
    index: DataSourceId,
    documents: records,
  });

  console.log(`search updated: ${records.length} records`);
}
