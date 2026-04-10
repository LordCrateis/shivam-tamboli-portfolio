import { useState } from 'react';
import { motion } from 'framer-motion';
import FadeUp from './FadeUp';

const PROJECTS = [
  {
    index: '01',
    title: 'NutriCore AI',
    description: 'Intelligent nutrition analysis engine using multi-modal data fusion. Classifies dietary patterns and predicts macronutrient profiles from unstructured food logs with 91.4% accuracy.',
    tags: ['Python', 'scikit-learn', 'Flask', 'TensorFlow', 'REST API'],
    year: '2024',
    status: 'Deployed',
    link: 'https://nutricore-ai-production.up.railway.app/',
  },
];

export default function Projects() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="work" className="py-28 px-6 md:px-12 lg:px-16">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-12">
          03 — Work
        </p>
      </FadeUp>

      <FadeUp delay={0.1}>
        <h2
          className="font-serif text-ink leading-tight mb-16"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
        >
          Selected Projects
        </h2>
      </FadeUp>

      <div className="divide-y divide-ink/10 border-t border-ink/10">
        {PROJECTS.map((project, i) => (
          <motion.div
            key={project.index}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <div
              className="relative flex flex-col md:flex-row md:items-start gap-4 py-8 px-6 transition-colors duration-300 group"
              style={{
                backgroundColor: hovered === i ? 'rgba(17,17,17,0.04)' : 'transparent',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              data-cursor="pointer"
            >
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10"
                ></a>
              )}

              <motion.div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-ink"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: hovered === i ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ transformOrigin: 'top' }}
              />

              <span className="terminal-text text-xs text-ink-muted w-8 mt-1 shrink-0">
                {project.index}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <h3 className="font-serif text-ink text-2xl md:text-3xl">{project.title}</h3>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="terminal-text text-xs text-ink-muted">{project.year}</span>
                    <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                      {project.status}
                    </span>
                  </div>
                </div>
                <p className="font-sans text-sm text-ink-muted leading-relaxed mb-4 max-w-2xl">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="terminal-text text-xs bg-ink/6 px-2 py-1 text-ink-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}