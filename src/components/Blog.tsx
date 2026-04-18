import { ArrowUpRight } from 'lucide-react';
import FadeUp from './FadeUp';

const POSTS = [
  {
    index: '01',
    title: 'What I Learned Building NutriCore AI',
    date: 'Jan 2026',
    readTime: '6 min read',
    category: 'Build Log',
    excerpt:
      'From noisy food logs to robust predictions, this write-up breaks down the modeling and engineering decisions that made NutriCore production-ready.',
  },
  {
    index: '02',
    title: 'S.A.C. Notes: On Modeling Emergent Awareness',
    date: 'Dec 2025',
    readTime: '8 min read',
    category: 'Research',
    excerpt:
      'A working note on the Schrödinger’s Artificial Consciousness framework and the practical limits of measuring machine subjectivity.',
  },
  {
    index: '03',
    title: 'A Practical Guide to ML Portfolios That Get Noticed',
    date: 'Nov 2025',
    readTime: '5 min read',
    category: 'Career',
    excerpt:
      'How to present projects, experiments, and outcomes with enough technical depth to stand out to teams hiring ML engineers.',
  },
];

export default function Blog() {
  const currentYear = new Date().getFullYear();

  return (
    <section className="pt-28 pb-20 px-6 md:px-12 lg:px-16 min-h-screen">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-10">
          Journal — {currentYear}
        </p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <h1
          className="font-serif text-ink leading-[0.95] tracking-tight mb-8"
          style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}
        >
          Blog.
        </h1>
      </FadeUp>

      <FadeUp delay={0.14}>
        <p className="font-sans text-base md:text-lg text-ink-muted max-w-2xl leading-relaxed mb-16">
          Essays, build logs, and machine learning notes — written with the same focus as the work itself.
        </p>
      </FadeUp>

      <div className="border-t border-ink/10 divide-y divide-ink/10">
        {POSTS.map((post) => (
          <FadeUp key={post.index} delay={0.16 + Number(post.index) * 0.07}>
            <article className="py-8">
              <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
                <p className="terminal-text text-xs text-ink-muted shrink-0 w-8 mt-1">{post.index}</p>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                    <span className="terminal-text text-xs text-ink-muted">{post.date}</span>
                    <span className="terminal-text text-xs text-ink-muted">{post.readTime}</span>
                    <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl text-ink mb-3">
                    {post.title}
                  </h2>
                  <p className="font-sans text-sm md:text-base text-ink-muted leading-relaxed max-w-3xl">
                    {post.excerpt}
                  </p>
                </div>

                <ArrowUpRight
                  size={18}
                  className="text-ink-muted lg:mt-1 shrink-0"
                />
              </div>
            </article>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}
