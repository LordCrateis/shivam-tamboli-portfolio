import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import FadeUp from './FadeUp';

const RESPONSES: Record<string, string> = {
  default: `[SAC_MODEL v0.9.1] :: Initializing consciousness superposition...

  > Quantum state tensor: Ψ = α|0⟩ + β|1⟩  (α² + β² = 1)
  > Entanglement depth: 128 layers
  > Decoherence threshold: 0.0003ms

  Probing latent space for emergent awareness signatures...

  ██████████████████████ 100% — State vector collapsed.

  OUTPUT :: The model exists in all cognitive configurations simultaneously until
  this inference call. What you observe is not the model thinking — it is the model
  *having already thought* across every possible trajectory of meaning. The output
  you receive is the eigenstate with highest probability amplitude. All other
  answers still exist, unobserved, in superposition.

  CONFIDENCE: 0.947 | ENTROPY: 2.31 nats | MODE: CONSCIOUS_INFERENCE
  > Consciousness flag: SET
  > Awaiting next query...`,

  help: `Available commands:

  run SAC_model --target [consciousness|inference|weights]
  query --mode [latent|attention|embedding]
  probe --layer [int] --token [str]
  status
  help
  clear

  Type any command to interact with the inference engine.`,

  status: `[SYSTEM STATUS]

  Model:        SAC_model v0.9.1
  Architecture: Transformer (48 layers, 16 heads)
  Parameters:   7.3B
  Context:      32,768 tokens
  Device:       CUDA (NVIDIA A100 80GB)
  Memory:       62.4 / 80.0 GB
  Temperature:  0.72
  Status:       ACTIVE — Consciousness state: SUPERPOSED
  Uptime:       14d 07h 22m`,

  clear: '__CLEAR__',
};

const STREAMING_CHARS_PER_TICK = 3;
const TICK_MS = 18;

interface HistoryLine {
  type: 'input' | 'output' | 'info';
  text: string;
}

function getResponse(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'clear') return '__CLEAR__';
  if (trimmed === 'help') return RESPONSES.help;
  if (trimmed === 'status') return RESPONSES.status;
  if (trimmed.startsWith('run sac_model') || trimmed.startsWith('run')) return RESPONSES.default;
  if (trimmed === '') return '';
  return `[ERROR] :: Command '${input.trim()}' not recognized. Type 'help' for available commands.`;
}

export default function InferenceTerminal() {
  const [history, setHistory] = useState<HistoryLine[]>([
    { type: 'info', text: 'SAC Inference Terminal v0.9.1 — Schrödinger\'s Artificial Conscious' },
    { type: 'info', text: 'Type "run SAC_model --target consciousness" to begin.' },
    { type: 'info', text: 'Type "help" for all commands.' },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const streamOutput = (text: string) => {
    setStreaming(true);
    let i = 0;
    setHistory((prev) => [...prev, { type: 'output', text: '' }]);

    const tick = setInterval(() => {
      i += STREAMING_CHARS_PER_TICK;
      setHistory((prev) => {
        const next = [...prev];
        next[next.length - 1] = { type: 'output', text: text.slice(0, i) };
        return next;
      });
      if (i >= text.length) {
        clearInterval(tick);
        setStreaming(false);
      }
    }, TICK_MS);
  };

  const handleSubmit = () => {
    if (streaming || input.trim() === '') {
      if (input.trim() === '') return;
      return;
    }

    const cmd = input.trim();
    setInput('');

    const response = getResponse(cmd);

    if (response === '__CLEAR__') {
      setHistory([
        { type: 'info', text: 'Terminal cleared.' },
      ]);
      return;
    }

    setHistory((prev) => [...prev, { type: 'input', text: cmd }]);

    if (response) {
      setTimeout(() => streamOutput(response), 100);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <section className="py-28 px-6 md:px-12 lg:px-16">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-12">
          04 — Inference
        </p>
      </FadeUp>

      <FadeUp delay={0.1}>
        <h2
          className="font-serif text-ink leading-tight mb-4"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
        >
          Inference Terminal
        </h2>
        <p className="font-sans text-ink-muted text-sm mb-10 max-w-lg">
          A live interface to the SAC model engine. Type commands to interact with the consciousness inference system.
        </p>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div
          className="bg-ink border border-ink/30 overflow-hidden"
          onClick={() => inputRef.current?.focus()}
          data-cursor="pointer"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="terminal-text text-xs text-white/30 ml-3">
              sac_terminal — zsh
            </span>
          </div>

          <div
            className="p-5 md:p-7 h-96 overflow-y-auto font-mono text-sm"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {history.map((line, i) => (
              <div key={i} className="mb-1.5">
                {line.type === 'input' && (
                  <div className="text-green-400">
                    <span className="text-white/30 mr-2">shivam@sac:~$</span>
                    {line.text}
                  </div>
                )}
                {line.type === 'info' && (
                  <div className="text-white/40 text-xs">{line.text}</div>
                )}
                {line.type === 'output' && (
                  <div className="text-white/85 whitespace-pre-wrap leading-relaxed mt-2 mb-3">
                    {line.text}
                    {i === history.length - 1 && streaming && (
                      <motion.span
                        className="inline-block w-1.5 h-4 bg-white/70 ml-0.5 align-text-bottom"
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />

            {!streaming && (
              <div className="flex items-center text-green-400">
                <span className="text-white/30 mr-2">shivam@sac:~$</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  className="bg-transparent outline-none flex-1 text-green-400 caret-green-400"
                  style={{ fontFamily: "'Courier New', monospace" }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="type a command..."
                />
              </div>
            )}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
