import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ML_PHRASES = [
  'initializing weights...',
  'loading dataset...',
  'forward pass...',
  'computing loss...',
  'backpropagation...',
  'optimizer: adam',
  'learning rate: 3e-4',
  'epoch 1/100...',
  'gradient descent...',
  'regularization l2...',
  'dropout: 0.3',
  'batch normalization...',
  'attention mechanism...',
  'softmax activation...',
  'cross-entropy loss...',
  'model checkpoint saved',
  'validation accuracy: 94.2%',
  'convergence achieved.',
];

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [count, setCount] = useState(0);
  const [phrase, setPhrase] = useState(ML_PHRASES[0]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let current = 0;
    const duration = 2800;
    const fps = 60;
    const steps = fps * (duration / 1000);
    const increment = 100 / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        setCount(100);
        clearInterval(timer);
        setTimeout(() => setDone(true), 400);
        setTimeout(onComplete, 900);
        return;
      }
      setCount(Math.floor(current));
    }, 1000 / fps);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    let idx = 0;
    const phraseTimer = setInterval(() => {
      idx = (idx + 1) % ML_PHRASES.length;
      setPhrase(ML_PHRASES[idx]);
    }, 160);
    return () => clearInterval(phraseTimer);
  }, []);

  const padded = String(count).padStart(3, '0');

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[9998] bg-ink flex flex-col items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div className="w-full max-w-2xl px-8">
            <div className="mb-8">
              <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-2">
                $ run shivam_portfolio.py
              </p>
              <p className="terminal-text text-sm text-green-400 min-h-[1.5rem]">
                <span className="opacity-60 mr-2">{'>'}</span>
                {phrase}
              </p>
            </div>

            <div className="relative mb-4">
              <div className="h-px bg-ink-light w-full">
                <motion.div
                  className="h-px bg-cream absolute top-0 left-0"
                  style={{ width: `${count}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <p className="terminal-text text-xs text-ink-muted tracking-widest">
                LOADING PORTFOLIO
              </p>
              <p
                className="font-serif text-cream leading-none"
                style={{ fontSize: 'clamp(4rem, 12vw, 9rem)' }}
              >
                {padded}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
