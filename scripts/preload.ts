import { createMdxPlugin } from 'fumadocs-mdx/bun';
import { postInstall } from 'fumadocs-mdx/next';

process.env.LINT = '1';
const configPath = 'source.config.ts';
await postInstall({ configPath });

const bunRuntime = (globalThis as { Bun?: { plugin: (plugin: unknown) => void } }).Bun;
bunRuntime?.plugin(createMdxPlugin({ configPath }));
