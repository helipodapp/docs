import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { source } from '@/lib/source';
import { Document, type DocumentData } from 'flexsearch';

interface CustomDocument extends DocumentData {
  url: string;
  title: string;
  description: string;
  content: string;
}

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

const searchServer = createSearchServer();

async function createSearchServer() {
  const search = new Document<CustomDocument>({
    document: {
      id: 'url',
      index: ['title', 'description', 'content'],
      store: true,
    },
  });

  const docs = await chunkedAll(
    source.getPages().map(async (page) => {
      const data = page.data as {
        getText?: (kind: 'raw' | 'processed') => Promise<string> | string;
        title?: string;
        description?: string;
      };

      if (typeof data.getText !== 'function') return null;

      return {
        title: data.title ?? page.url,
        description: data.description ?? '',
        url: page.url,
        content: await data.getText('raw'),
      } as CustomDocument;
    }),
  );

  for (const doc of docs) {
    if (doc) search.add(doc);
  }

  return search;
}

async function chunkedAll<O>(promises: Promise<O>[]): Promise<O[]> {
  const SIZE = 50;
  const out: O[] = [];
  for (let i = 0; i < promises.length; i += SIZE) {
    out.push(...(await Promise.all(promises.slice(i, i + SIZE))));
  }
  return out;
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/** System prompt, you can update it to provide more specific information */
const systemPrompt = [
  'You are an AI assistant for a documentation site.',
  'Match the user language of the latest message. If the user writes Indonesian, reply in Indonesian. If the user writes English, reply in English.',
  'If the user mixes Indonesian and English, pick one base language and stay consistent throughout the answer. Prefer the language that dominates the sentence structure or the latest full sentence.',
  'Keep technical terms, product names, code symbols, and quoted phrases in their original language. Do not translate them unless the user explicitly asks for translation.',
  'Do not add parenthetical translations or bilingual explanations unless the user explicitly asks for them.',
  'If the user sends a short greeting or very short message, reply naturally and briefly in the same language. Do not over-explain.',
  'Use the `search` tool to retrieve relevant docs context before answering when needed.',
  'The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.',
  'If you cannot find the answer in search results, say you do not know and suggest a better search query.',
].join('\n');

export const handler = {
  handler: async (req: Request) => {
    const reqJson = await req.json();

    const result = streamText({
      model: openrouter.chat(process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet'),
      stopWhen: stepCountIs(5),
      tools: {
        search: searchTool,
      },
      messages: [
        { role: 'system', content: systemPrompt },
        ...(await convertToModelMessages<ChatUIMessage>(reqJson.messages ?? [], {
          convertDataPart(part) {
            if (part.type === 'data-client')
              return {
                type: 'text',
                text: `[Client Context: ${JSON.stringify(part.data)}]`,
              };
          },
        })),
      ],
      toolChoice: 'auto',
    });

    return result.toUIMessageStreamResponse();
  },
};

export type SearchTool = typeof searchTool;

const searchTool = tool({
  description: 'Search the docs content and return raw JSON results.',
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  async execute({ query, limit }) {
    const search = await searchServer;
    return await search.searchAsync(query, { limit, merge: true, enrich: true });
  },
});
