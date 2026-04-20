import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import FadeUp from './FadeUp';
import { supabase } from '../lib/supabase';

interface ProjectRecord {
  id: string;
  title: string;
  category: string | null;
  year: number | null;
  description: string | null;
  tech_stack: string[] | null;
  live_url: string | null;
  status: 'Deployed' | 'In Progress' | 'Archived' | null;
  order_index: number | null;
  visible: boolean | null;
}

interface ProjectEditorState {
  id: string | null;
  title: string;
  category: string;
  year: string;
  description: string;
  techStackInput: string;
  liveUrl: string;
  status: 'Deployed' | 'In Progress' | 'Archived';
}

const DEFAULT_PROJECT_CATEGORY = 'General';
const CUSTOM_CATEGORY_VALUE = '__custom__';
const PROJECT_STATUSES: Array<'Deployed' | 'In Progress' | 'Archived'> = [
  'Deployed',
  'In Progress',
  'Archived',
];

const EMPTY_EDITOR: ProjectEditorState = {
  id: null,
  title: '',
  category: DEFAULT_PROJECT_CATEGORY,
  year: '',
  description: '',
  techStackInput: '',
  liveUrl: '',
  status: 'In Progress',
};

function normalizeCategory(category: string | null | undefined): string {
  return category?.trim() || DEFAULT_PROJECT_CATEGORY;
}

interface ProjectsProps {
  isAdminSession: boolean;
}

export default function Projects({ isAdminSession }: ProjectsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ProjectEditorState>(EMPTY_EDITOR);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const options = new Set<string>([DEFAULT_PROJECT_CATEGORY]);
    projects.forEach((project) => {
      options.add(normalizeCategory(project.category));
    });
    return Array.from(options);
  }, [projects]);

  const selectedCategoryValue = categoryOptions.includes(editor.category)
    ? editor.category
    : CUSTOM_CATEGORY_VALUE;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('projects')
      .select('id,title,category,year,description,tech_stack,live_url,status,order_index,visible')
      .order('order_index', { ascending: true })
      .order('year', { ascending: false });

    if (!isAdminSession) {
      query = query.eq('visible', true);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError('Unable to load projects right now.');
      setProjects([]);
    } else {
      setProjects((data ?? []) as ProjectRecord[]);
    }

    setLoading(false);
  }, [isAdminSession]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleEdit = (project: ProjectRecord) => {
    setEditor({
      id: project.id,
      title: project.title,
      category: normalizeCategory(project.category),
      year: project.year ? String(project.year) : '',
      description: project.description ?? '',
      techStackInput: (project.tech_stack ?? []).join(', '),
      liveUrl: project.live_url ?? '',
      status: project.status ?? 'In Progress',
    });
  };

  const openNewEditor = () => {
    setEditor(EMPTY_EDITOR);
    setPendingDeleteId(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor.title.trim()) {
      setError('Project title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const techStack = editor.techStackInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const parsedYear = editor.year.trim() ? Number(editor.year.trim()) : null;
    if (editor.year.trim() && Number.isNaN(parsedYear)) {
      setError('Year must be a valid number.');
      setSaving(false);
      return;
    }

    let nextOrderIndex = 1;
    if (!editor.id) {
      const maxOrderIndex = projects.reduce((max, project) => {
        const value = project.order_index ?? 0;
        return value > max ? value : max;
      }, 0);
      nextOrderIndex = maxOrderIndex + 1;
    }

    const payload = {
      title: editor.title.trim(),
      category: normalizeCategory(editor.category),
      year: parsedYear,
      description: editor.description.trim(),
      tech_stack: techStack,
      live_url: editor.liveUrl.trim() || null,
      status: editor.status,
      visible: true,
      order_index: editor.id
        ? projects.find((project) => project.id === editor.id)?.order_index ?? nextOrderIndex
        : nextOrderIndex,
    };

    if (editor.id) {
      const { error: updateError } = await supabase.from('projects').update(payload).eq('id', editor.id);
      if (updateError) {
        setError('Unable to save this project right now.');
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('projects').insert(payload);
      if (insertError) {
        setError('Unable to save this project right now.');
        setSaving(false);
        return;
      }
    }

    setEditor(EMPTY_EDITOR);
    await fetchProjects();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', id);
    if (deleteError) {
      setError('Unable to delete this project right now.');
      return;
    }

    setPendingDeleteId(null);
    if (editor.id === id) {
      setEditor(EMPTY_EDITOR);
    }
    await fetchProjects();
  };

  return (
    <section id="work" className="py-28 px-6 md:px-12 lg:px-16">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-12">
          03 — Work
        </p>
      </FadeUp>

      <FadeUp delay={0.1}>
        <h2 className="font-serif text-ink leading-tight mb-16" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}>
          Selected Projects
        </h2>
      </FadeUp>

      {isAdminSession && (
        <FadeUp delay={0.14}>
          <div className="mb-8 border border-ink/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <p className="terminal-text text-xs text-ink-muted uppercase">Admin project controls</p>
              <button
                onClick={openNewEditor}
                className="inline-flex items-center gap-2 bg-ink text-cream px-3 py-2 text-xs uppercase tracking-wide"
                data-cursor="pointer"
              >
                <Plus size={14} />
                Add Project
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={editor.title}
                  onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Title"
                  className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  required
                />
                <div className="relative">
                  <select
                    value={selectedCategoryValue}
                    onChange={(event) => {
                      if (event.target.value === CUSTOM_CATEGORY_VALUE) {
                        setEditor((prev) => ({
                          ...prev,
                          category: categoryOptions.includes(prev.category) ? '' : prev.category,
                        }));
                        return;
                      }

                      setEditor((prev) => ({ ...prev, category: event.target.value }));
                    }}
                    className="blog-category-select"
                    aria-label="Project category"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value={CUSTOM_CATEGORY_VALUE}>Custom...</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                </div>
              </div>

              {selectedCategoryValue === CUSTOM_CATEGORY_VALUE && (
                <input
                  value={editor.category}
                  onChange={(event) => setEditor((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Custom category"
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  required
                />
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="number"
                  value={editor.year}
                  onChange={(event) => setEditor((prev) => ({ ...prev, year: event.target.value }))}
                  placeholder="Year"
                  className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                />
                <select
                  value={editor.status}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      status: event.target.value as ProjectEditorState['status'],
                    }))
                  }
                  className="blog-category-select"
                  aria-label="Project status"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={editor.description}
                onChange={(event) => setEditor((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
                className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none min-h-24"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={editor.techStackInput}
                  onChange={(event) => setEditor((prev) => ({ ...prev, techStackInput: event.target.value }))}
                  placeholder="Tech Stack (comma-separated)"
                  className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                />
                <input
                  value={editor.liveUrl}
                  onChange={(event) => setEditor((prev) => ({ ...prev, liveUrl: event.target.value }))}
                  placeholder="Live URL"
                  className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-ink text-cream px-4 py-2 text-xs uppercase tracking-wide disabled:opacity-60"
                  data-cursor="pointer"
                >
                  {saving ? 'Saving…' : editor.id ? 'Update Project' : 'Save Project'}
                </button>
                {editor.id && (
                  <button
                    type="button"
                    onClick={openNewEditor}
                    className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide"
                    data-cursor="pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </FadeUp>
      )}

      {loading && <p className="text-sm text-ink-muted mb-4">Loading projects…</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="divide-y divide-ink/10 border-t border-ink/10">
        {projects.map((project, i) => {
          const techTags = project.tech_stack ?? [];

          return (
            <motion.div
              key={project.id}
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
                {project.live_url && (
                  <a
                    href={project.live_url}
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

                <span className="terminal-text text-xs text-ink-muted w-8 mt-1 shrink-0 relative z-20">
                  {String(project.order_index ?? i + 1).padStart(2, '0')}
                </span>

                <div className="flex-1 min-w-0 relative z-20">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <h3 className="font-serif text-ink text-2xl md:text-3xl">{project.title}</h3>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="terminal-text text-xs text-ink-muted">{project.year ?? '—'}</span>
                      <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                        {project.status ?? 'In Progress'}
                      </span>
                    </div>
                  </div>

                  <p className="font-sans text-sm text-ink-muted leading-relaxed mb-4 max-w-2xl">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {techTags.map((tag) => (
                      <span key={tag} className="terminal-text text-xs bg-ink/6 px-2 py-1 text-ink-muted">
                        {tag}
                      </span>
                    ))}
                    <span className="terminal-text text-xs border border-ink/20 px-2 py-1 text-ink-muted">
                      {normalizeCategory(project.category)}
                    </span>
                  </div>

                  {isAdminSession && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="inline-flex items-center gap-1 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide"
                        data-cursor="pointer"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(project.id)}
                        className="inline-flex items-center gap-1 border border-red-300 text-red-600 px-3 py-1.5 text-xs uppercase tracking-wide"
                        data-cursor="pointer"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}

                  {isAdminSession && pendingDeleteId === project.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border border-red-200 bg-red-50/40 px-3 py-2">
                      <p className="text-xs text-red-700">Delete this project permanently?</p>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="border border-red-300 text-red-700 px-2 py-1 text-xs uppercase tracking-wide"
                        data-cursor="pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="border border-ink/20 text-ink px-2 py-1 text-xs uppercase tracking-wide"
                        data-cursor="pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
