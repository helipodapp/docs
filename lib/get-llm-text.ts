import { type Page } from '@/lib/source';
import { getSection } from './source/navigation';

export async function getLLMText(page: Page) {
  if (page.data.type === 'openapi') return '';

  const section = getSection(page.slugs[0]);
  const category =
    {
      framework: 'Helipod (Framework Mode)',
      ui: 'Helipod UI (the default theme of Helipod)',
      headless: 'Helipod Core (the core library of Helipod)',
      mdx: 'Helipod MDX (the built-in content source)',
      cli: 'Helipod CLI (the CLI tool for automating Helipod apps)',
    }[section] ?? section;

  const processed = await page.data.getText('processed');

  return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/helipodapp/docs/refs/heads/main/apps/docs/content/docs/${page.path}

${page.data.description ?? ''}
        
${processed}`;
}
