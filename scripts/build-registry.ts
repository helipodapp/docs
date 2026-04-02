import { combineRegistry, RegistryCompiler, writeFumadocsRegistry } from '@fumadocs/cli/build';
import { registry } from '@/components/registry/index.js';
import type { Registry } from '@fumadocs/cli/build';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

async function loadExternalRegistry(candidates: string[]): Promise<Registry | null> {
  for (const candidate of candidates) {
    const absolute = path.resolve(scriptDir, candidate);
    const withExtensions = [absolute, `${absolute}.ts`, `${absolute}.tsx`, `${absolute}.js`, `${absolute}.mjs`];
    const existing = withExtensions.find((item) => existsSync(item));
    if (!existing) continue;

    const mod = await import(pathToFileURL(existing).href);
    if (mod?.registry) return mod.registry as Registry;
  }

  return null;
}

export async function buildRegistry() {
  const [radixRegistry, baseRegistry] = await Promise.all([
    loadExternalRegistry(['../../packages/radix-ui/registry', '../../../packages/radix-ui/registry']),
    loadExternalRegistry(['../../packages/base-ui/registry', '../../../packages/base-ui/registry']),
  ]);

  const compileTasks = [new RegistryCompiler(registry).compile()];
  if (radixRegistry) compileTasks.push(new RegistryCompiler(radixRegistry).compile());
  if (baseRegistry) compileTasks.push(new RegistryCompiler(baseRegistry).compile());

  const results = await Promise.all(compileTasks);
  const all = results.slice(1).reduce((acc, current) => combineRegistry(acc, current), results[0]!);

  await writeFumadocsRegistry(all, {
    dir: 'public/registry',
  });
}
