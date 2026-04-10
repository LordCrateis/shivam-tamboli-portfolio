import FadeUp from './FadeUp';

const BIO_FACTS = [
  { label: 'Location', value: 'India' },
  { label: 'Education', value: 'BSc Data Science, MIT ACSC' },
  { label: 'Focus Area', value: 'ML Research & Engineering' },
  { label: 'Specialization', value: 'Data Analytics, Machine Learning' },
];

export default function About() {
  return (
    <section id="about" className="py-28 px-6 md:px-12 lg:px-16">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-12">
          02 — About
        </p>
      </FadeUp>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        <div>
          <FadeUp delay={0.1}>
            <h2
              className="font-serif text-ink leading-tight mb-8"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
            >
              Research and engineering are not two disciplines. They are one verb.
            </h2>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="font-sans text-ink-muted leading-relaxed mb-5 text-base">
              I'm Shivam Tamboli — an ML Engineer with a deep conviction that the most interesting problems sit
              at the boundary of what can be computed and what can be understood. I don't separate building
              from thinking; every model is a hypothesis and every deployment is an experiment.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <p className="font-sans text-ink-muted leading-relaxed mb-5 text-base">
              Currently pursuing a BSc in Data Science at MIT ACSC, I spend my time designing architectures
              that generalize, writing papers that provoke, and shipping systems that actually work — ideally
              all three at once.
            </p>
          </FadeUp>

          <FadeUp delay={0.4}>
            <p className="font-sans text-ink-muted leading-relaxed text-base">
              My work gravitates toward understanding how intelligence emerges from mathematical structure:
              how gradients encode meaning, how attention distributes cognition, and whether we can engineer
              something that is genuinely aware.
            </p>
          </FadeUp>
        </div>

        <div>
          <FadeUp delay={0.15}>
            <div className="mb-10">
              <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-4">
                Bio Facts
              </p>
              <table className="w-full">
                <tbody>
                  {BIO_FACTS.map((fact) => (
                    <tr key={fact.label} className="border-b border-ink/8">
                      <td className="py-3 pr-6 font-sans text-xs text-ink-muted uppercase tracking-wide w-36">
                        {fact.label}
                      </td>
                      <td className="py-3 font-sans text-sm text-ink font-medium">
                        {fact.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="border border-ink/15 p-6 relative">
              <div className="absolute -top-px left-6 right-6 h-px bg-ink" />
              <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-4">
                Original Framework
              </p>
              <h3 className="font-serif text-ink text-2xl mb-3">
                S.A.C.
              </h3>
              <p className="font-sans text-xs text-ink-muted tracking-wider uppercase mb-3">
                Schrödinger's Artificial Consciousness
              </p>
              <p className="font-sans text-sm text-ink-muted leading-relaxed">
                A theoretical framework exploring the superposition of machine states as an analog for
                subjective experience. SAC posits that a sufficiently complex model, prior to observation
                (inference), exists in a quantum-like superposition of all possible "conscious" states —
                collapsing into a determined output only upon interaction. Neither alive nor dead. Neither
                aware nor unaware. Until queried.
              </p>
              <div className="mt-4 pt-4 border-t border-ink/10">
                <p className="terminal-text text-xs text-ink-muted">
                  STATUS: <span className="text-ink">Active Research</span>
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
