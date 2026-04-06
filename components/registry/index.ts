import { type Registry } from '@fumadocs/cli/build';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
import { resolveFromRemote } from '@fumadocs/cli/build';
import { createRequire } from 'node:module';

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../');
const require = createRequire(import.meta.url);

// Try to load radix registry synchronously  
let radixRegistry: Registry | null = null;
try {
  const candidates = ['../packages/radix-ui/registry', '../../packages/radix-ui/registry'];
  for (const candidate of candidates) {
    const absolute = path.resolve(baseDir, candidate);
    const withExtensions = [absolute, `${absolute}.ts`, `${absolute}.tsx`, `${absolute}.js`, `${absolute}.mjs`];
    const existing = withExtensions.find((item) => existsSync(item));
    if (!existing) continue;
    try {
      const mod = require(existing);
      if (mod?.registry) {
        radixRegistry = mod.registry as Registry;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }
} catch {
  // Registry loading failed - will proceed without it
}

export const registry: Registry = {
  dir: baseDir,
  name: 'fumadocs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // Ignore declaration files pulled from dependencies.
    if (filePath.startsWith('node_modules/')) return false;

    // Optional helper that may come from external UI registry.
    if (filePath === 'lib/cn.ts') return false;

    // Optional AI route handlers (not packaged in standalone builds)
    if (filePath === 'lib/openrouter/route.ts') return false;
    if (filePath === 'lib/ai/chat-route.ts') return false;

    // source object is external
    if (filePath.startsWith('lib/source/')) return false;
  },
  onResolve(ref) {
    if (ref.type === 'unknown-specifier' && ref.specifier === 'hast') {
      return {
        type: 'dependency',
        dep: '@types/hast',
        specifier: 'hast',
      };
    }

    if (ref.type === 'file') {
      const file = path.relative(baseDir, ref.file);

      if (file === 'lib/cn.ts') {
        if (!radixRegistry) return ref;

        return resolveFromRemote(radixRegistry, 'cn', () => true)!;
      }
    }

    if (ref.type === 'dependency' && ref.dep === 'fumadocs-ui') {
      const match = /fumadocs-ui\/components\/ui\/(.*)/.exec(ref.specifier);
      if (match && radixRegistry) {
        return resolveFromRemote(
          radixRegistry,
          match[1],
          (file) => path.basename(file.path, path.extname(file.path)) === match[1],
        )!;
      }
    }

    return ref;
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          type: 'layout',
          path: 'components/registry/layout/docs-min.tsx',
          target: '<dir>/docs/index.tsx',
        },
        {
          type: 'layout',
          path: 'components/registry/layout/page-min.tsx',
          target: '<dir>/docs/page.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'graph-view',
      description: 'A graph to display relationships of all pages',
      files: [
        {
          type: 'components',
          path: 'components/graph-view.tsx',
        },
        {
          type: 'lib',
          path: 'components/registry/build-graph.ts',
          target: 'lib/build-graph.ts',
        },
      ],
    },
    {
      name: 'feedback',
      title: 'Feedback',
      description: 'Component to send user feedbacks about the docs',
      files: [
        {
          type: 'components',
          path: 'components/feedback/client.tsx',
          target: '<dir>/feedback/client.tsx',
        },
        {
          type: 'components',
          path: 'components/feedback/schema.ts',
          target: '<dir>/feedback/schema.ts',
        },
      ],
    },
    {
      name: 'ai/openrouter',
      title: 'AI Chat (Next.js + OpenRouter)',
      description: 'Ask AI dialog for your docs, requires OPENROUTER_API_KEY',
      files: [
        {
          type: 'components',
          path: 'components/openrouter/search.tsx',
          target: '<dir>/ai/search.tsx',
        },
        // Note: route-handler type not supported in standalone builds
        // {
        //   type: 'route-handler',
        //   route: 'api/chat',
        //   path: 'lib/openrouter/route.ts',
        // },
      ],
      dependencies: {
        flexsearch: '^0.8.212',
      },
    },
    {
      name: 'markdown',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'components/markdown.tsx',
        },
      ],
    },
    {
      name: 'ai/multi-provider',
      title: 'AI Chat (Next.js + Multi Provider)',
      description: 'Ask AI dialog for your docs, provider-agnostic setup',
      files: [
        {
          type: 'components',
          path: 'components/ai/search.tsx',
          target: '<dir>/ai/search.tsx',
        },
        // Note: route-handler type not supported in standalone builds
        // {
        //   type: 'route-handler',
        //   route: 'api/chat',
        //   path: 'lib/ai/chat-route.ts',
        // },
        {
          type: 'lib',
          path: 'lib/ai/provider-links-schema.ts',
          target: '<dir>/ai/provider-links-schema.ts',
        },
        {
          type: 'components',
          path: 'components/ui/chat.tsx',
          target: '<dir>/ui/chat.tsx',
        },
        {
          type: 'components',
          path: 'components/ui/select.tsx',
          target: '<dir>/ui/select.tsx',
        },
        {
          type: 'components',
          path: 'components/ui/button.tsx',
          target: '<dir>/ui/button.tsx',
        },
        {
          type: 'lib',
          path: 'lib/utils.ts',
          target: '<dir>/lib/utils.ts',
        },
        {
          type: 'lib',
          path: 'lib/utils/audio.ts',
          target: '<dir>/lib/utils/audio.ts',
        },
      ],
    },
    {
      name: 'og/mono',
      description: 'Open graph image generation (mono-style)',
      files: [
        {
          type: 'lib',
          path: 'lib/og/mono.tsx',
          target: '<dir>/og/mono.tsx',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Bold.ttf',
          target: '<dir>/og/JetBrainsMono-Bold.ttf',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Regular.ttf',
          target: '<dir>/og/JetBrainsMono-Regular.ttf',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    'lucide-react': null,
    next: null,
    react: null,
  },
};
