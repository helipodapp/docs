import { openapi } from '@/lib/openapi';
import { defaultShikiOptions } from '@/lib/shiki';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createOpenAPIPage(openapi, {
  shikiOptions: defaultShikiOptions,
});
