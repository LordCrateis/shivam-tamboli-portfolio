import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const CATEGORIES = [
  {
    label: 'Core Languages',
    items: ['Python', 'SQL', 'R', 'Bash', 'JavaScript', 'TypeScript'],
  },
  {
    label: 'Machine Learning',
    items: ['PyTorch', 'TensorFlow', 'scikit-learn', 'HuggingFace', 'XGBoost', 'LightGBM', 'Optuna', 'MLflow'],
  },
  {
    label: 'Data Operations',
    items: ['Pandas', 'NumPy', 'Polars', 'Apache Spark', 'Airflow', 'dbt', 'PostgreSQL', 'BigQuery'],
  },
  {
    label: 'Architecture',
    items: ['Docker', 'FastAPI', 'Flask', 'GCP', 'AWS', 'Git', 'CI/CD', 'REST & gRPC'],
  },
];

export default function Stack() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      id="stack"
      className="py-28 px-6 md:px-12 lg:px-16 bg-ink"
    >
      <motion.p
        className="terminal-text text-xs text-white/30 tracking-widest uppercase mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        05 — Stack
      </motion.p>

      <motion.h2
        className="font-serif text-cream leading-tight mb-20"
        style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        The Tools.
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-white/10">
        {CATEGORIES.map((cat, ci) => (
          <motion.div
            key={cat.label}
            className={`py-10 pr-8 ${ci !== 0 ? 'lg:pl-8 lg:border-l border-white/10' : ''} ${ci > 1 ? 'md:pl-8 md:border-l border-white/10' : ''}`}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6, delay: 0.15 + ci * 0.08 }}
          >
            <p className="terminal-text text-xs text-white/30 tracking-widest uppercase mb-6">
              {cat.label}
            </p>
            <ul className="space-y-3">
              {cat.items.map((item, ii) => (
                <motion.li
                  key={item}
                  className="font-sans text-cream/80 text-sm flex items-center gap-2 group"
                  initial={{ opacity: 0, x: -8 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.4, delay: 0.25 + ci * 0.06 + ii * 0.035 }}
                >
                  <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-cream transition-colors duration-200 shrink-0" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
