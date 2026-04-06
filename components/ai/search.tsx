'use client';
import {
  useCallback,
  type ComponentProps,
  createContext,
  type FormEvent,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Bot, MessageCircleIcon, X } from 'lucide-react';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { Presence } from '@radix-ui/react-presence';
import { DefaultChatTransport } from 'ai';
import { toast } from 'sonner';
import { Chat } from '@/components/ui/chat';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { transcribeAudio } from '@/lib/utils/audio';
import type { DocsChatUIMessage } from '@/lib/ai/chat-route';

const TOAST_ID_SEND_ERROR = 'chat-send-error';
const TOAST_ID_SUGGESTION_ERROR = 'chat-suggestion-error';

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: UseChatHelpers<DocsChatUIMessage>;
  clearHistory: () => void;
} | null>(null);

type ChatProps = {
  messages?: DocsChatUIMessage[];
};

const CHAT_HISTORY_LIMIT = 20;

function textFromParts(message: DocsChatUIMessage): string {
  const parts = message.parts as Array<{ type?: string; text?: string }> | undefined;
  if (!Array.isArray(parts)) return '';

  return parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('\n');
}

function areMessagesEquivalent(a: DocsChatUIMessage[], b: DocsChatUIMessage[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];

    if (left.role !== right.role) return false;
    if (textFromParts(left) !== textFromParts(right)) return false;
  }

  return true;
}

export function ChatDemo(props: ChatProps) {
  const [input, setInput] = useState('');
  const hasLoadedDraftRef = useRef(false);
  const context = use(Context);
  const draftKey = useMemo(() => {
    if (typeof window === 'undefined') return 'docs-ai-chat-draft';

    const path = window.location.pathname || 'global';
    return `docs-ai-chat-draft:${path}`;
  }, []);
  const historyKey = useMemo(() => {
    if (typeof window === 'undefined') return 'docs-ai-chat-history';

    const path = window.location.pathname || 'global';
    return `docs-ai-chat-history:${path}`;
  }, []);

  const localChat = useChat<DocsChatUIMessage>({
    ...props,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const {
    messages,
    sendMessage,
    stop,
    status,
    setMessages,
  } = context?.chat ?? localChat;
  const clearHistory = context?.clearHistory;

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(draftKey);
      if (!stored) return;

      setInput(stored);
    } catch {
      // Access to storage can fail in private mode or restrictive browser settings.
    } finally {
      hasLoadedDraftRef.current = true;
    }
  }, [draftKey]);

  useEffect(() => {
    if (!hasLoadedDraftRef.current) return;

    try {
      if (input.length === 0) {
        window.sessionStorage.removeItem(draftKey);
        return;
      }

      // Keep persisted drafts bounded to avoid hitting storage quotas.
      const value = input.slice(0, 4000);
      window.sessionStorage.setItem(draftKey, value);
    } catch {
      // Ignore persistence failures to keep chat interaction uninterrupted.
    }
  }, [draftKey, input]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message) return;

    try {
      await sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: message,
          },
        ],
      });
      setInput('');
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Keep draft as-is when send fails so user can retry.
      toast.error('Failed to send message. Please try again.', { id: TOAST_ID_SEND_ERROR });
    }
  };

  const append = async (message: { role: 'user'; content: string }) => {
    try {
      await sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: message.content,
          },
        ],
      });
      setInput('');
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Keep any existing draft if quick suggestion sending fails.
      toast.error('Failed to send suggestion. Please try again.', { id: TOAST_ID_SUGGESTION_ERROR });
    }

    return null;
  };

  const clearChat = () => {
    stop();

    if (clearHistory) {
      clearHistory();
    } else {
      setMessages(() => []);
    }

    setInput('');

    try {
      window.sessionStorage.removeItem(draftKey);
      window.sessionStorage.removeItem(historyKey);
    } catch {
      // Ignore storage failures and keep UI state cleared.
    }
  };

  return (
    <div className={cn('flex', 'h-full', 'w-full', 'min-h-115', 'flex-col')}>
      <Chat
        className="grow"
        messages={messages}
        handleSubmit={handleSubmit}
        input={input}
        handleInputChange={handleInputChange}
        isGenerating={isLoading}
        stop={stop}
        append={append}
        setMessages={setMessages}
        onClear={clearChat}
        transcribeAudio={transcribeAudio}
        suggestions={[
          'What are the best practices for deploying services on Helipod?',
          'Explain how to set up a project from scratch.',
          'How can I troubleshoot a failed production build?',
        ]}
      />
    </div>
  );
}

export function AISearchPanelHeader({ className, ...props }: ComponentProps<'div'>) {
  const { setOpen } = useAISearchContext();

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-start gap-2 rounded-xl border bg-fd-secondary text-fd-secondary-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center rounded-lg border bg-fd-background p-2 m-2 mb-0">
        <Bot className="size-4 text-fd-primary" />
      </div>
      <div className="px-1 py-2 flex-1">
        <p className="text-sm font-medium mb-1">AI Chat</p>
        <p className="text-xs text-fd-muted-foreground">Answers may be imperfect. Verify important details.</p>
      </div>

      <button
        aria-label="Close"
        tabIndex={-1}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-fd-muted-foreground m-1')}
        onClick={() => setOpen(false)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function AISearchInputActions() {
  return null;
}

export function AISearchInput(props: ComponentProps<'form'>) {
  return <form {...props} />;
}

export function AISearch({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const hasLoadedHistoryRef = useRef(false);
  const suppressPersistOnceRef = useRef(false);
  const historyKey = useMemo(() => {
    if (typeof window === 'undefined') return 'docs-ai-chat-history';

    const path = window.location.pathname || 'global';
    return `docs-ai-chat-history:${path}`;
  }, []);
  const chat = useChat<DocsChatUIMessage>({
    id: 'search',
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const { messages, setMessages } = chat;

  const clearHistory = useCallback(() => {
    suppressPersistOnceRef.current = true;
    setMessages(() => []);

    try {
      window.sessionStorage.removeItem(historyKey);
    } catch {
      // Keep UI clear even if storage access fails.
    }
  }, [historyKey, setMessages]);

  useEffect(() => {
    if (hasLoadedHistoryRef.current) return;

    try {
      const stored = window.sessionStorage.getItem(historyKey);
      if (!stored) return;

      const parsed = JSON.parse(stored) as DocsChatUIMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!areMessagesEquivalent(parsed, messages)) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore malformed history payloads.
    } finally {
      hasLoadedHistoryRef.current = true;
    }
  }, [historyKey, messages, setMessages]);

  useEffect(() => {
    if (!hasLoadedHistoryRef.current) return;

    if (suppressPersistOnceRef.current) {
      suppressPersistOnceRef.current = false;

      try {
        window.sessionStorage.removeItem(historyKey);
      } catch {
        // Keep chat functional even when storage access fails.
      }

      return;
    }

    try {
      const trimmed = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-CHAT_HISTORY_LIMIT)
        .map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
        }));

      if (trimmed.length === 0) {
        window.sessionStorage.removeItem(historyKey);
        return;
      }

      window.sessionStorage.setItem(historyKey, JSON.stringify(trimmed));
    } catch {
      // Keep chat functional even when storage access fails.
    }
  }, [historyKey, messages]);

  return (
    <Context value={useMemo(() => ({ chat, open, setOpen, clearHistory }), [chat, clearHistory, open])}>
      {children}
    </Context>
  );
}

export function AISearchTrigger({
  position = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { position?: 'default' | 'float' }) {
  const { open, setOpen } = useAISearchContext();

  return (
    <button
      data-state={open ? 'open' : 'closed'}
      className={cn(
        position === 'float' && [
          'fixed bottom-4 gap-3 w-24 inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] shadow-lg z-20 transition-[translate,opacity]',
          open && 'translate-y-10 opacity-0',
        ],
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {props.children}
    </button>
  );
}

export function AISearchPanel() {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return (
    <>
      <Presence present={open}>
        <div
          data-state={open ? 'open' : 'closed'}
          className="fixed inset-0 z-30 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          className={cn(
            'overflow-hidden z-30 bg-fd-card text-fd-card-foreground [--ai-chat-width:420px] 2xl:[--ai-chat-width:500px]',
            'max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:border max-lg:rounded-2xl max-lg:shadow-xl',
            'lg:fixed lg:right-0 lg:top-0 lg:h-dvh lg:border-s lg:shadow-xl',
            open ? 'animate-fd-dialog-in lg:animate-fd-fade-in' : 'animate-fd-dialog-out lg:animate-fd-fade-out',
          )}
        >
          <div className="h-full p-2 lg:w-(--ai-chat-width) lg:p-3 flex flex-col gap-2">
            <AISearchPanelHeader />
            <ChatDemo />
          </div>
        </div>
      </Presence>
    </>
  );
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('h-full', className)} style={style} {...props}>
      <ChatDemo />
    </div>
  );
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      e.preventDefault();
    }

    if (e.key === '/' && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, []);
}

export function useAISearchContext() {
  return use(Context)!;
}
