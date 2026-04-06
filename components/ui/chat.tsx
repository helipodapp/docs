'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Check, Copy, Send, Square, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const behavior: ScrollBehavior = messages.length <= 1 ? 'auto' : 'smooth';
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }, [messages.length, isGenerating]);

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
    <div className={cn('flex h-full min-h-0 flex-col rounded-xl border bg-fd-card shadow-sm', className)}>
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
                        <div className="max-w-none text-sm leading-6 [&_p]:text-sm [&_li]:text-sm [&_code]:text-[13px] [&_pre]:my-2 [&_pre]:text-[13px] [&_pre]:leading-6 [&_code]:before:content-none [&_code]:after:content-none">
                          <Markdown text={text || '...'} />
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
