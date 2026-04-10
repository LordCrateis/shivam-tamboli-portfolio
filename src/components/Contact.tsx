import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Github, Mail, ArrowUpRight } from 'lucide-react';

export default function Contact() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      id="contact"
      className="py-28 px-6 md:px-12 lg:px-16 border-t border-ink/10 relative overflow-hidden"
    >
      <motion.p
        className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-16"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        06 — Contact
      </motion.p>

      <div className="mb-16">
        <motion.a
          href="mailto:shivamrtamboli62@gmmail.com"
          className="font-serif text-ink leading-none tracking-tight block group w-fit"
          style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          data-cursor="pointer"
        >
          <span className="inline-flex items-end gap-4 group-hover:opacity-70 transition-opacity duration-300">
            Let's Talk.
            <ArrowUpRight
              className="text-ink-muted mb-4 shrink-0 transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-2"
              size={Math.max(32, 48)}
              style={{ width: 'clamp(2rem, 4vw, 4rem)', height: 'clamp(2rem, 4vw, 4rem)' }}
            />
          </span>
        </motion.a>
      </div>

      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 border-t border-ink/10 pt-8"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex items-center gap-8">
          <a
            href="https://github.com/LordCrateis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-sans text-sm text-ink-muted hover:text-ink transition-colors duration-200 group"
            data-cursor="pointer"
          >
            <Github size={16} />
            <span>GitHub</span>
            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </a>
          <a
            href="mailto:shivamrtamboli62@gmail.com"
            className="flex items-center gap-2 font-sans text-sm text-ink-muted hover:text-ink transition-colors duration-200 group"
            data-cursor="pointer"
          >
            <Mail size={16} />
            <span>Email</span>
            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </a>
        </div>

        <p className="terminal-text text-xs text-ink-muted">
          © 2025 Shivam Tamboli. All rights reserved.
        </p>
      </motion.div>
    </section>
  );
}
