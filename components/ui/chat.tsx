'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Check, ChevronDown, Copy, Send, Square, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import { toast } from 'sonner';

const TOAST_ID_CLEAR = 'chat-cleared';
const TOAST_ID_STOP = 'chat-generation-stopped';
const TOAST_ID_COPY_ERROR = 'chat-copy-error';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
  createdAt?: string | Date;
};

type UserPrompt = {
  role: 'user';
  content: string;
};

type SetMessages<TMessage extends ChatMessage> = (
  messages: TMessage[] | ((messages: TMessage[]) => TMessage[]),
) => void;

type AppendMessage = (message: UserPrompt) => Promise<string | null | undefined>;

type ChatProps<TMessage extends ChatMessage = ChatMessage> = {
  className?: string;
  messages: TMessage[];
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isGenerating: boolean;
  stop: () => void;
  append: AppendMessage;
  setMessages: SetMessages<TMessage>;
  onClear?: () => void;
  transcribeAudio?: (audio: Blob | File) => Promise<string>;
  suggestions?: string[];
};

function textFromMessage(message: ChatMessage): string {
  if (message.content) return message.content;
  if (!message.parts) return '';

  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
}

function formatTimestamp(value?: string | Date): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function linkifySourceValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Keep existing markdown links untouched.
  if (/^\[[^\]]+\]\([^\)]+\)$/.test(trimmed)) return trimmed;

  // Convert bracket-only path format like [/best-practices] into a real markdown link.
  const bracketOnly = trimmed.match(/^\[([^\]]+)\]$/);
  if (bracketOnly) {
    const inner = bracketOnly[1].trim();
    if (/^\/[\w\-./#?=&%]+$/.test(inner) || /^https?:\/\/\S+$/i.test(inner)) {
      return `[${inner}](${inner})`;
    }
  }

  const normalized = trimmed.replace(/[),.;:!?]+$/, '');
  const isPath = /^\/[\w\-./#?=&%]+$/.test(normalized);
  const isUrl = /^https?:\/\/\S+$/i.test(normalized);

  if (!isPath && !isUrl) return trimmed;

  return `[${normalized}](${normalized})`;
}

function normalizeAssistantSources(text: string): string {
  const lines = text.split('\n');
  let inSourcesSection = false;

  return lines
    .map((line) => {
      const sourcesHeader = line.match(/^\s*sources\s*:\s*(.*)$/i);
      if (sourcesHeader) {
        inSourcesSection = true;
        const rest = sourcesHeader[1].trim();
        if (!rest) return '';

        const parts = rest.split(',').map((part) => linkifySourceValue(part.trim()));
        return parts.join(' ');
      }

      if (!inSourcesSection) return line;

      if (!line.trim()) {
        inSourcesSection = false;
        return line;
      }

      // Stop rewriting once another heading starts.
      if (/^\s*#{1,6}\s+/.test(line)) {
        inSourcesSection = false;
        return line;
      }

      const bulletMatch = line.match(/^(\s*[-*]\s+)(.+)$/);
      if (bulletMatch) {
        return linkifySourceValue(bulletMatch[2]);
      }

      return linkifySourceValue(line);
    })
    .join('\n');
}

function prettifySourceLabels(text: string): string {
  return text.replace(/\[([^\]]+)\]\((\/[^\)\s]+)\)/g, (_full, label: string, href: string) => {
    if (label.trim() !== href.trim()) return `[${label}](${href})`;

    const cleaned = href
      .replace(/^\/+/, '')
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean)
      .join(' / ')
      .replace(/[-_]+/g, ' ')
      .trim();

    if (!cleaned) return `[Home](${href})`;

    const pretty = cleaned
      .split(' ')
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
      .join(' ');

    return `[${pretty}](${href})`;
  });
}

function prepareAssistantText(text: string): string {
  return prettifySourceLabels(normalizeAssistantSources(text));
}

function isNearBottom(element: HTMLDivElement, threshold = 120): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

export function Chat<TMessage extends ChatMessage>({
  className,
  messages,
  handleSubmit,
  input,
  handleInputChange,
  isGenerating,
  stop,
  append,
  setMessages,
  onClear,
  suggestions = [],
}: ChatProps<TMessage>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const behavior: ScrollBehavior = messages.length <= 1 ? 'auto' : 'smooth';
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
    setShowScrollToBottom(false);
  }, [messages.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      setShowScrollToBottom(!isNearBottom(el));
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const copyText = async (id: string, value: string) => {
    if (!value.trim()) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error('Unable to copy message.', { id: TOAST_ID_COPY_ERROR });
    }
  };

  return (
    <div className={cn('relative flex h-full min-h-0 flex-col rounded-xl border bg-fd-card shadow-sm', className)}>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
            <Bot className="size-5 text-fd-muted-foreground" />
            <p className="text-sm text-fd-muted-foreground">Ask anything about your docs.</p>
            <div className="grid w-full gap-2 text-left">
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-md border bg-fd-secondary px-3 py-2 text-xs hover:bg-fd-accent hover:text-fd-accent-foreground"
                  onClick={() => {
                    void append({ role: 'user', content: suggestion });
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages
            .filter((message) => message.role !== 'system')
            .map((message) => {
              const text = textFromMessage(message);
              const assistantText = message.role === 'assistant' ? prepareAssistantText(text) : text;
              const isUser = message.role === 'user';
              const roleLabel = isUser ? 'You' : 'Assistant';
              const timeLabel = formatTimestamp(message.createdAt);

              return (
                <div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[86%]')}>
                    <div
                      className={cn(
                        'mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-fd-muted-foreground',
                        isUser ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <span>{roleLabel}</span>
                      {timeLabel ? <span className="normal-case tracking-normal opacity-80">{timeLabel}</span> : null}
                    </div>
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm leading-6',
                        isUser
                          ? 'bg-fd-primary text-fd-primary-foreground'
                          : 'border bg-fd-secondary text-fd-secondary-foreground',
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">{text || '...'}</p>
                      ) : (
                        <div className="max-w-none text-sm leading-6 [&_p]:text-sm [&_li]:text-sm [&_code]:text-[13px] [&_pre]:my-2 [&_pre]:text-[13px] [&_pre]:leading-6 [&_code]:before:content-none [&_code]:after:content-none [&_a]:inline-flex [&_a]:align-middle [&_a]:items-center [&_a]:max-w-52 [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap [&_a]:rounded-full [&_a]:border [&_a]:border-fd-primary/25 [&_a]:bg-fd-primary/10 [&_a]:px-2 [&_a]:py-0.5 [&_a]:text-xs [&_a]:leading-4 [&_a]:font-medium [&_a]:text-fd-primary [&_a]:no-underline hover:[&_a]:bg-fd-primary/15">
                          <Markdown text={assistantText || '...'} />
                        </div>
                      )}
                    </div>

                    {!isUser && text ? (
                      <button
                        type="button"
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'sm' }),
                          'mt-1 h-7 px-2 text-xs text-fd-muted-foreground',
                        )}
                        onClick={() => {
                          void copyText(message.id, text);
                        }}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="size-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
        )}

        {isGenerating ? (
          <div className="flex justify-start">
            <div className="max-w-[86%]">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-fd-muted-foreground">
                Assistant
              </p>
              <div className="inline-flex items-center gap-1 rounded-xl border bg-fd-secondary px-2.5 py-2 text-fd-secondary-foreground">
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showScrollToBottom ? (
        <button
          type="button"
          aria-label="Scroll to latest message"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'icon' }),
            'absolute bottom-28 right-4 z-10 h-8 w-8 rounded-full shadow-md',
          )}
          onClick={() => {
            const el = listRef.current;
            if (!el) return;

            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            setShowScrollToBottom(false);
          }}
        >
          <ChevronDown className="size-4" />
        </button>
      ) : null}

      <div className="border-t p-2">
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="h-20 w-full resize-none rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your question..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
              onClick={() => {
                if (onClear) {
                  onClear();
                } else {
                  setMessages(() => []);
                }

                toast.success('Chat cleared', { id: TOAST_ID_CLEAR });
              }}
            >
              <Trash2 className="size-4" />
              Clear
            </button>

            {isGenerating ? (
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
                onClick={() => {
                  stop();
                  toast.info('Generation stopped', { id: TOAST_ID_STOP });
                }}
              >
                <Square className="size-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send message"
                title="Send message"
                className={cn(buttonVariants({ size: 'icon' }), 'ml-auto')}
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
