import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Maximize2,
  MessageCircle,
  Minimize2,
  X,
} from 'lucide-react';

type Role = 'assistant' | 'user';

type Message = {
  id: number;
  role: Role;
  content: string;
  time: string;
};

const FLAMOLINA_API_URL = import.meta.env.VITE_FLAMOLINA_API_URL || 'http://localhost:8000/chat';

const loadingWords = [
  'climbing',
  'passing',
  'swimming',
  'dribbling',
  'writing',
  'brainstorming',
  'sketching',
  'connecting',
  'composing',
  'thinking',
  'mapping',
  'researching',
];

const suggestions = [
  'Walk me through your best projects',
  'What kind of work do you enjoy?',
  'Tell me something unexpected',
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    time: 'now',
    content:
      "Hey — I’m **Flamolina**, Shivam’s little corner of the portfolio. Ask me about his work, process, or anything that caught your eye.",
  },
  {
    id: 2,
    role: 'assistant',
    time: 'now',
    content:
      "I can keep it concise or go deep. Try asking for a project breakdown, a quick comparison, or a neat little table.",
  },
];

function getTime() {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function MarkdownReply({ content }: { content: string }) {
  return (
    <div className="flamolina-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          table: ({ ...props }) => (
            <div className="flamolina-table-wrap">
              <table {...props} />
            </div>
          ),
          code: ({ className, children, ...props }) => (
            <code className={className} {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ThinkingIndicator() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % loadingWords.length);
    }, 1150);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
      <span className="flamolina-thinking-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="min-w-[9rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={loadingWords[wordIndex]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="inline-block"
          >
            {loadingWords[wordIndex]}…
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

export default function FlamolinaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversationLabel = useMemo(() => (messages.length > 2 ? 'active thread' : 'open thread'), [messages.length]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 260);
    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const sendMessage = async (value = input) => {
    const trimmed = value.trim();
    if (!trimmed || isThinking) return;

    const userMessage: Message = { id: Date.now(), role: 'user', content: trimmed, time: getTime() };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch(FLAMOLINA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!response.ok) throw new Error(`Flamolina request failed with ${response.status}`);
      const payload = (await response.json()) as { answer?: string };
      const answer = payload.answer?.trim();
      if (!answer) throw new Error('Flamolina returned an empty answer');

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: answer, time: getTime() },
      ]);
    } catch (error) {
      console.error('Flamolina request failed', error);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          time: getTime(),
          content:
            'I can’t reach my backend right now. Start the Flamolina API and make sure `VITE_FLAMOLINA_API_URL` points to its `/chat` endpoint.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const copyMessage = async (message: Message) => {
    await navigator.clipboard?.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className={`flamolina-root fixed inset-0 z-[90] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <AnimatePresence>
          {isOpen && (
            <motion.button
              type="button"
              aria-label="Close Flamolina"
              className="flamolina-backdrop pointer-events-auto fixed inset-0 cursor-default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => {
                setIsFullscreen(false);
                setIsOpen(false);
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {isOpen ? (
            <div className={`flamolina-modal-positioner pointer-events-auto ${isFullscreen ? 'is-fullscreen' : ''}`}>
              <motion.section
                key="panel"
                layout
                aria-label="Flamolina chat"
                role="dialog"
                aria-modal="true"
                className="flamolina-panel flex h-[min(720px,calc(100vh-4rem))] w-[min(520px,calc(100vw-2rem))] flex-col overflow-hidden"
                initial={{ opacity: 0, scale: 0.84, filter: 'blur(3px)', transformOrigin: 'calc(100% + 300px) calc(100% + 300px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.16, filter: 'blur(4px)', transformOrigin: 'calc(100% + 300px) calc(100% + 300px)' }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
                onClick={(event) => event.stopPropagation()}
              >
              <header className="flamolina-header shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flamolina-avatar">
                      <img src="/avatar.png" alt="Flamolina" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-xl leading-none text-ink">Flamolina</h2>
                        <span className="flamolina-live-dot" aria-label="Online" />
                      </div>
                      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-ink-muted">portfolio companion · {conversationLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-ink-muted">
                    <button
                      className="flamolina-icon-button"
                      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      type="button"
                      onClick={() => setIsFullscreen((current) => !current)}
                    >
                      {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                    </button>
                    <button
                      className="flamolina-icon-button"
                      aria-label="Close Flamolina"
                      type="button"
                      onClick={() => {
                        setIsFullscreen(false);
                        setIsOpen(false);
                      }}
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-3 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> grounded in Shivam’s work</span>
                  <button type="button" className="hover:text-ink transition-colors" onClick={() => setMessages(initialMessages)}>new chat</button>
                </div>
              </header>

              <div ref={scrollRef} className="flamolina-messages min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
                <div className="mb-7 text-center">
                  <span className="flamolina-date-label">today · {getTime()}</span>
                </div>
                {messages.map((message) => (
                  <div key={message.id} className={`flamolina-message-row ${message.role === 'user' ? 'is-user' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="flamolina-mini-avatar">
                        <img src="/avatar.png" alt="Flamolina" />
                      </div>
                    )}
                    <div className="max-w-[88%]">
                      <div className={`flamolina-bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                        {message.role === 'assistant' ? <MarkdownReply content={message.content} /> : <p>{message.content}</p>}
                      </div>
                      <div className={`mt-1.5 flex items-center gap-2 text-[10px] text-ink-muted ${message.role === 'user' ? 'justify-end' : ''}`}>
                        <span>{message.role === 'assistant' ? 'Flamolina' : 'you'} · {message.time}</span>
                        {message.role === 'assistant' && (
                          <button type="button" className="flamolina-copy-button" onClick={() => copyMessage(message)} aria-label="Copy response">
                            {copiedId === message.id ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedId === message.id ? 'copied' : 'copy'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flamolina-message-row">
                    <div className="flamolina-mini-avatar">
                      <img src="/avatar.png" alt="Flamolina" />
                    </div>
                    <div className="flamolina-bubble assistant-bubble"><ThinkingIndicator /></div>
                  </div>
                )}
              </div>

              <footer className="flamolina-composer shrink-0">
                <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-none">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} type="button" className="flamolina-suggestion" onClick={() => sendMessage(suggestion)}>{suggestion}</button>
                  ))}
                </div>
                <div className="flamolina-input-shell">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask Flamolina anything…"
                    aria-label="Message Flamolina"
                  />
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1 text-ink-muted">
                      <span className="font-sans text-[10px] tracking-wide">shift + enter for a new line</span>
                    </div>
                    <button type="button" className="flamolina-send-button" aria-label="Send message" onClick={() => sendMessage()} disabled={!input.trim() || isThinking}>
                      <ArrowUp size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-center font-sans text-[9px] uppercase tracking-[0.14em] text-ink-muted/80">Flamolina can make mistakes · verify important details</p>
              </footer>
              </motion.section>
            </div>
          ) : (
            <motion.button
              key="launcher"
              type="button"
              className="flamolina-launcher pointer-events-auto fixed bottom-5 right-5 md:bottom-8 md:right-8"
              aria-label="Open Flamolina chat"
              onClick={() => {
                setIsFullscreen(false);
                setIsOpen(true);
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="flamolina-launcher-orbit" />
              <MessageCircle size={19} strokeWidth={1.8} />
              <span className="font-serif text-lg">Chat with Flamolina</span>
              <ChevronDown size={15} className="rotate-180 opacity-60" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
