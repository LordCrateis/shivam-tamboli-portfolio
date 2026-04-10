import { motion } from 'framer-motion';

const META = [
  { label: 'Role', value: 'ML Engineer' },
  { label: 'Study', value: 'BSc Data Science' },
  { label: 'Institute', value: 'MIT ACSC' },
  { label: 'Status', value: 'Open to Research' },
];

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-between pt-16 pb-0 px-6 md:px-12 lg:px-16 relative">
      <motion.div
        className="flex items-start justify-between pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <span className="terminal-text text-xs text-ink-muted tracking-widest uppercase">
          ST — Portfolio 2025
        </span>
        <span className="terminal-text text-xs text-ink-muted tracking-widest uppercase">
          v2.0
        </span>
      </motion.div>

      <div className="flex-1 flex flex-col justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1
            className="font-serif text-ink leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11rem)' }}
          >
            Shivam's
            <br />
            <span className="italic">Portfolio.</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-8 text-ink-muted font-sans font-light text-lg max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
        >
          Building machine intelligence at the intersection of rigorous research and pragmatic engineering.
        </motion.p>
      </div>

      <motion.div
        className="border-t border-ink/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {META.map((item, i) => (
            <div
              key={item.label}
              className={`py-6 pr-6 ${i !== 0 ? 'pl-6 border-l border-ink/10' : ''}`}
            >
              <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-1">
                {item.label}
              </p>
              <p className="font-sans font-medium text-ink text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
