import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Github } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ProjectGallery from './ProjectGallery';
import ProjectMedia from './ProjectMedia';
import ProjectCollaborators from './ProjectCollaborators';
import ProjectRatings from './ProjectRatings';
import { supabase } from '../lib/supabase';
import {
  formatProjectDate,
  getProjectSlug,
  PROJECT_SELECT_BASE,
  PROJECT_SELECT_EXTENDED,
  ProjectRecord,
  resolveProjectPresentation,
} from '../lib/projectContent';

interface ProjectPageProps {
  slug: string;
  isAdminSession: boolean;
}

function normalizeCategory(category: string | null | undefined): string {
  return category?.trim() || 'General';
}

export default function ProjectPage({ slug, isAdminSession }: ProjectPageProps) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryVersion, setGalleryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchProject = async () => {
      setLoading(true);
      setError(null);

      let extendedQuery = supabase
        .from('projects')
        .select(PROJECT_SELECT_EXTENDED)
        .order('order_index', { ascending: true });

      if (!isAdminSession) extendedQuery = extendedQuery.eq('visible', true);
      const extendedResult = await extendedQuery;

      let records: ProjectRecord[] = [];
      if (!extendedResult.error) {
        records = (extendedResult.data ?? []) as ProjectRecord[];
      } else {
        let fallbackQuery = supabase
          .from('projects')
          .select(PROJECT_SELECT_BASE)
          .order('order_index', { ascending: true });
        if (!isAdminSession) fallbackQuery = fallbackQuery.eq('visible', true);
        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) {
          if (!cancelled) {
            setError('Unable to load this project right now.');
            setLoading(false);
          }
          return;
        }
        records = (fallbackResult.data ?? []) as ProjectRecord[];
      }

      const decodedSlug = decodeURIComponent(slug).toLowerCase();
      const match = records.find((record) => getProjectSlug(record).toLowerCase() === decodedSlug) ?? null;

      if (!cancelled) {
        setProject(match);
        setError(match ? null : 'That project could not be found.');
        setLoading(false);
      }
    };

    void fetchProject();
    return () => {
      cancelled = true;
    };
  }, [isAdminSession, slug]);

  const presentation = useMemo(
    () => (project ? resolveProjectPresentation(project) : null),
    [project],
  );

  useEffect(() => {
    if (!project) return;
    const previousTitle = document.title;
    document.title = `${project.title} — Shivam Tamboli`;
    return () => {
      document.title = previousTitle;
    };
  }, [project]);

  if (loading) {
    return (
      <div className="px-6 pb-24 pt-32 md:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-8 h-4 w-36 bg-ink/10" />
          <div className="mb-5 h-16 max-w-3xl bg-ink/10" />
          <div className="h-5 max-w-2xl bg-ink/5" />
        </div>
      </div>
    );
  }

  if (!project || !presentation || error) {
    return (
      <section className="flex min-h-[75vh] flex-col items-center justify-center px-6 pt-24 text-center">
        <p className="terminal-text mb-4 text-xs uppercase tracking-[0.18em] text-ink-muted">Project not found</p>
        <h1 className="mb-4 font-serif text-4xl text-ink">The trail ends here.</h1>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-ink-muted">
          {error || 'This project is unavailable.'}
        </p>
        <a
          href="#work"
          className="inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs uppercase tracking-wide text-cream"
          data-cursor="pointer"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to projects
        </a>
      </section>
    );
  }

  const techStack = project.tech_stack ?? [];

  return (
    <article className="px-6 pb-24 pt-28 md:px-12 md:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <motion.a
          href="#work"
          className="terminal-text mb-14 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          data-cursor="pointer"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Selected projects
        </motion.a>

        <header className="border-b border-ink/10 pb-12 md:pb-16">
          <motion.div
            className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <span className="terminal-text text-xs uppercase tracking-[0.16em] text-ink-muted">
              {normalizeCategory(project.category)}
            </span>
            <span className="h-px w-8 bg-ink/20" aria-hidden="true" />
            <span className="terminal-text text-xs text-ink-muted">
              {formatProjectDate(project.project_date, project.year)}
            </span>
            <span className="terminal-text border border-ink/20 px-2.5 py-1 text-xs text-ink-muted">
              {project.status ?? 'In Progress'}
            </span>
          </motion.div>

          <motion.h1
            className="max-w-5xl font-serif leading-[0.98] tracking-[-0.025em] text-ink"
            style={{ fontSize: 'clamp(3.25rem, 8vw, 7.5rem)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55 }}
          >
            {project.title}
          </motion.h1>

          <motion.p
            className="mt-8 max-w-3xl font-serif text-xl leading-relaxed text-ink-light md:text-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5 }}
          >
            {presentation.kicker}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs uppercase tracking-wide text-cream transition-opacity hover:opacity-80"
                data-cursor="pointer"
              >
                {presentation.liveCtaLabel} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
            {presentation.githubUrl && (
              <a
                href={presentation.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-ink/25 px-5 py-3 text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
                data-cursor="pointer"
              >
                <Github size={14} aria-hidden="true" /> View on GitHub <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
          </motion.div>
        </header>

        <div className="py-10 md:py-14">
          <p className="max-w-3xl text-base leading-8 text-ink-muted md:text-lg">
            {project.description || presentation.kicker}
          </p>
        </div>

        <ProjectGallery
          projectId={project.id}
          projectTitle={project.title}
          refreshKey={galleryVersion}
        />

        {isAdminSession && (
          <section className="project-gallery-manager mt-8 border border-ink/15 p-5 md:p-7" aria-label="Manage project gallery">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="terminal-text mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">Admin only</p>
                <h2 className="font-serif text-2xl text-ink">Manage gallery</h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                Upload screenshots or add product videos here. Changes appear in the slider above.
              </p>
            </div>
            <ProjectMedia
              projectId={project.id}
              isAdminSession
              onMediaChange={() => setGalleryVersion((version) => version + 1)}
            />
          </section>
        )}

        <div className="grid gap-14 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-20">
          <div className="project-case-study min-w-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{presentation.caseStudy}</ReactMarkdown>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border-t border-ink/15 pt-5">
              <p className="terminal-text mb-5 text-xs uppercase tracking-[0.16em] text-ink-muted">Built with</p>
              <div className="flex flex-wrap gap-2">
                {techStack.map((technology) => (
                  <span key={technology} className="terminal-text bg-ink/[0.055] px-2.5 py-1.5 text-xs text-ink-muted">
                    {technology}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-10 border-t border-ink/15 pt-5">
              <p className="terminal-text mb-4 text-xs uppercase tracking-[0.16em] text-ink-muted">Visitor signal</p>
              <ProjectRatings projectId={project.id} />
            </div>
          </aside>
        </div>

        <ProjectCollaborators projectId={project.id} isAdminSession={isAdminSession} />

        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-ink/10 pt-8">
          <a
            href="#work"
            className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            data-cursor="pointer"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Back to selected projects
          </a>
          {presentation.githubUrl && (
            <a
              href={presentation.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
              data-cursor="pointer"
            >
              Inspect the repository <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </footer>
      </div>
    </article>
  );
}
