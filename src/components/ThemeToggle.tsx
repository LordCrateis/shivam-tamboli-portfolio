import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      data-cursor="pointer"
      className="relative inline-flex items-center h-9 w-16 shrink-0 border border-ink/20 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
      <Sun size={14} className="absolute left-2 text-ink-muted" />
      <Moon size={14} className="absolute right-2 text-ink-muted" />
      <motion.span
        className="relative z-10 flex items-center justify-center h-7 w-7 rounded-full bg-ink text-cream"
        animate={{ x: isDark ? 32 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </motion.span>
    </button>
  );
}