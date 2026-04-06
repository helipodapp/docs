import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
// Note: $routeHandler macro from @fumadocs/cli/registry is not available in standalone builds
// This route handler implementation provides the necessary functionality directly
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from 'ai';
import { DataSourceId, orama } from '@/lib/orama/client';

export type DocsChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

const DEFAULT_CEREBRAS_MODEL = process.env.CEREBRAS_MODEL ?? 'llama3.1-8b';
const CEREBRAS_BASE_URL = process.env.CEREBRAS_BASE_URL ?? 'https://api.cerebras.ai/v1';
const KEY_COOLDOWN_MS = Number(process.env.CEREBRAS_KEY_COOLDOWN_MS ?? 45_000);

const keyCooldownUntil = new Map<string, number>();

function listCerebrasModels(preferredModel?: string): string[] {
  const configured = (process.env.CEREBRAS_MODELS ?? '')
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);

  const defaults = ['llama3.1-8b', 'llama3.1-70b'];

  return [preferredModel, DEFAULT_CEREBRAS_MODEL, ...configured, ...defaults].filter(
    (model, index, arr): model is string =>
      typeof model === 'string' && model.length > 0 && arr.indexOf(model) === index,
  );
}

function listCerebrasKeys(): string[] {
  const fromList = (process.env.CEREBRAS_API_KEYS ?? '')
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
  const single = process.env.CEREBRAS_API_KEY?.trim();

  return single ? [single, ...fromList.filter((k) => k !== single)] : fromList;
}

function getAvailableKeyIndices(keys: string[]): number[] {
  const now = Date.now();
  const available: number[] = [];

  keys.forEach((key, index) => {
    const until = keyCooldownUntil.get(key) ?? 0;
    if (until <= now) {
      if (until > 0) keyCooldownUntil.delete(key);
      available.push(index);
    }
  });

  // If all keys are cooling down, try all keys as a last resort.
  return available.length > 0 ? available : keys.map((_, index) => index);
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key');
}

function isModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('model_not_found') ||
    message.includes('does not exist') ||
    message.includes('do not have access')
  );
}

function extractLatestUserText(uiMessages: unknown[]): string {
  for (let i = uiMessages.length - 1; i >= 0; i--) {
    const msg = uiMessages[i] as { role?: string; parts?: unknown[]; content?: string };
    if (msg.role !== 'user') continue;

    if (Array.isArray(msg.parts)) {
      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j] as { type?: string; text?: string };
        if (part.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0) {
          return part.text.trim();
        }
      }
    }

    if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
      return msg.content.trim();
    }
  }

  return '';
}

function isGreetingOnly(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  if (!normalized) return false;

  const greetings = [
    /^h+(e+|a+)llo+!?$/,
    /^hi+!?$/,
    /^hey+!?$/,
    /^halo+!?$/,
    /^halo+!?$/,
    /^hai+!?$/,
    /^ass?alam(?:u|ualaikum)?(?:\s+warahmatullahi\s+wabarakatuh)?!?$/,
    /^selamat\s+(pagi|siang|sore|malam)!?$/,
    /^apa\s+kabar\??$/,
  ];

  return greetings.some((pattern) => pattern.test(normalized));
}

function buildGreetingReply(text: string): string {
  const normalized = text.toLowerCase().trim();

  if (/^(hi|hey|hello)+!?$/.test(normalized)) return 'Hi! How can I help you?';

  return 'Halo! Ada yang bisa saya bantu?';
}

function stringifyDocField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

interface SourceItem {
  id: string;
  title: string;
  url?: string;
}

interface ContextPayload {
  context: string | null;
  sources: SourceItem[];
}

async function buildOramaContext(query: string): Promise<ContextPayload> {
  if (!query || !DataSourceId) return { context: null, sources: [] };

  try {
    const result = await orama.search({
      term: query,
      datasources: [DataSourceId],
      limit: 5,
    });

    const sources: SourceItem[] = [];

    const snippets = result.hits
      .map((hit, idx) => {
        const doc = hit.document as Record<string, unknown>;
        const id = `S${idx + 1}`;
        const title = stringifyDocField(doc.title) || `Result ${idx + 1}`;
        const url = stringifyDocField(doc.url) || stringifyDocField(doc.path);
        const body =
          stringifyDocField(doc.content) ||
          stringifyDocField(doc.text) ||
          stringifyDocField(doc.description) ||
          stringifyDocField(doc.summary);

        if (!body && !url) return null;

        sources.push({ id, title, url: url || undefined });

        return [
          `### [${id}] ${title}`,
          url ? `Source: ${url}` : 'Source: internal documentation index',
          body.slice(0, 1200),
        ]
          .filter(Boolean)
          .join('\n');
      })
      .filter((v): v is string => Boolean(v));

    if (snippets.length === 0) return { context: null, sources: [] };

    return { context: snippets.join('\n\n'), sources };
  } catch (error) {
    console.warn('[ai-chat] Failed to fetch Orama context:', error);
    return { context: null, sources: [] };
  }
}

function buildSystemPrompt(context: string | null, sources: SourceItem[]): string {
  const base =
    'You are Helipod Docs assistant. Answer clearly and briefly. If information is uncertain, say so.';
  const languageRules = [
    'Match the user language of the latest message. If the user writes Indonesian, reply in Indonesian. If the user writes English, reply in English.',
    'If the user mixes Indonesian and English, pick one base language and stay consistent throughout the answer. Prefer the language that dominates the sentence structure or the latest full sentence.',
    'Keep technical terms, product names, code symbols, and quoted phrases in their original language. Do not translate them unless the user explicitly asks for translation.',
    'Do not add parenthetical translations or bilingual explanations unless the user explicitly asks for them.',
    'If the user sends a short greeting or very short message, reply naturally and briefly in the same language. Do not over-explain.',
  ].join('\n');

  if (!context) {
    return `${base}\n${languageRules}\nNo indexed context was found for this query. Do not invent sources.`;
  }

  const sourceMap = sources
    .map((source) => (source.url ? `- [${source.id}] ${source.title} - ${source.url}` : `- [${source.id}] ${source.title}`))
    .join('\n');

  return `${base}\n${languageRules}\n\nUse the indexed documentation context below as the primary source of truth.\nCitation rules:\n- Use inline citations like [S1] when a claim is grounded in context.\n- End every answer with a section titled "Sources".\n- In the "Sources" section, list only sources you actually used.\n- If no sources were used, write "Sources: None".\n\nAvailable sources:\n${sourceMap}\n\nContext:\n${context}`;
}

async function createCerebrasResponse(reqJson: { messages: unknown[]; model?: string }) {
  const keys = listCerebrasKeys();
  const requestedModel = typeof reqJson.model === 'string' ? reqJson.model.trim() : undefined;
  const models = listCerebrasModels(requestedModel);

  if (keys.length === 0) {
    throw new Error('Missing Cerebras key. Set CEREBRAS_API_KEY or CEREBRAS_API_KEYS.');
  }

  if (models.length === 0) {
    throw new Error('Missing Cerebras model. Set CEREBRAS_MODEL or CEREBRAS_MODELS.');
  }

  const latestQuery = extractLatestUserText(reqJson.messages ?? []);

  if (isGreetingOnly(latestQuery)) {
    const reply = buildGreetingReply(latestQuery);

    const stream = createUIMessageStream<DocsChatUIMessage>({
      execute: ({ writer }) => {
        const id = crypto.randomUUID();

        writer.write({ type: 'text-start', id });
        writer.write({ type: 'text-delta', id, delta: reply });
        writer.write({ type: 'text-end', id });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const contextPayload = await buildOramaContext(latestQuery);
  const modelMessages = await convertToModelMessages<DocsChatUIMessage>(reqJson.messages as DocsChatUIMessage[], {
    ignoreIncompleteToolCalls: true,
    convertDataPart(part) {
      if (part.type === 'data-client') {
        return {
          type: 'text',
          text: `[Client Context: ${JSON.stringify(part.data)}]`,
        };
      }
    },
  });

  const messagesWithContext = [
    {
      role: 'system' as const,
      content: buildSystemPrompt(contextPayload.context, contextPayload.sources),
    },
    ...modelMessages,
  ];

  const keyIndices = getAvailableKeyIndices(keys);
  const startIndex = Math.floor(Math.random() * keyIndices.length);

  let lastError: unknown;
  for (let i = 0; i < keyIndices.length; i++) {
    const index = keyIndices[(startIndex + i) % keyIndices.length];
    const apiKey = keys[index];
    const provider = createOpenAICompatible({
      name: 'cerebras',
      apiKey,
      baseURL: CEREBRAS_BASE_URL,
    });

    for (const model of models) {
      console.info(
        `[ai-chat] attempt key ${index + 1}/${keys.length}, model ${model}, query="${latestQuery.slice(0, 80)}"`,
      );

      try {
        const result = streamText({
          model: provider(model),
          messages: messagesWithContext,
          maxRetries: 0,
        });
        return result.toUIMessageStreamResponse();
      } catch (error) {
        lastError = error;

        if (isModelNotFoundError(error)) {
          console.warn(`[ai-chat] Cerebras model "${model}" unavailable, trying next model.`);
          continue;
        }

        const shouldRotate = isRateLimitError(error) || isAuthError(error);
        if (!shouldRotate) break;

        keyCooldownUntil.set(apiKey, Date.now() + KEY_COOLDOWN_MS);

        console.warn(`[ai-chat] key ${index + 1}/${keys.length} blocked by auth/rate limit, rotating key.`);
        break;
      }
    }
  }

  if (isModelNotFoundError(lastError)) {
    throw new Error(
      `No available Cerebras model found. Tried: ${models.join(', ')}. Set CEREBRAS_MODEL to a model available in your account.`,
    );
  }

  throw lastError;
}

export const handler = {
  handler: async (req: Request) => {
    const reqJson = await req.json();

    return createCerebrasResponse(reqJson);
  },
};
