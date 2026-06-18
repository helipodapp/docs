import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// NOTE: Registry build is currently disabled because @fumadocs/cli@1.3.x
// no longer exports RegistryCompiler, combineRegistry, or writeFumadocsRegistry.
// The ./build subpath was removed from the package exports.
//
// The pre-generated registry files in public/registry/ are committed to the repo
// and don't need to be rebuilt on every deploy.
//
// To re-enable, check @fumadocs/cli changelog for when these exports are restored.

export async function buildRegistry() {
  console.log('[build-registry] Skipped — using pre-generated registry files in public/registry/');
}
