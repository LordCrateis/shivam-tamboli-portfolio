import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Github, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CollaboratorRecord {
  id: string;
  project_id: string;
  name: string;
  github_url: string;
  order_index: number;
}

interface ProjectCollaboratorsProps {
  projectId: string;
  isAdminSession: boolean;
}

function parseGithubProfile(value: string): { url: string; username: string; avatarUrl: string } | null {
  const trimmed = value.trim().replace(/^@/, '');
  if (!trimmed) return null;

  const candidate = trimmed.includes('://') ? trimmed : `https://github.com/${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) return null;

    const username = parsed.pathname.split('/').filter(Boolean)[0];
    if (!username || !/^[a-zd](?:[a-zd-]{0,37}[a-zd])?$/i.test(username)) return null;

    return {
      username,
      url: `https://github.com/${username}`,
      avatarUrl: `https://github.com/${username}.png?size=160`,
    };
  } catch {
    return null;
  }
}

function CollaboratorAvatar({ collaborator }: { collaborator: CollaboratorRecord }) {
  const [imageFailed, setImageFailed] = useState(false);
  const profile = parseGithubProfile(collaborator.github_url);
  const initials = collaborator.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (!profile || imageFailed) {
    return (
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-ink/15 bg-ink/[0.055] font-serif text-xl text-ink">
        {initials || '?'}
      </span>
    );
  }

  return (
    <img
      src={profile.avatarUrl}
      alt=""
      className="h-16 w-16 shrink-0 rounded-full border border-ink/15 bg-ink/[0.055] object-cover"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function ProjectCollaborators({ projectId, isAdminSession }: ProjectCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
  const [name, setName] = useState('');
  const [githubProfile, setGithubProfile] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('project_collaborators')
      .select('id,project_id,name,github_url,order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (fetchError) {
      setCollaborators([]);
      setError(isAdminSession ? 'Collaborator storage is not available yet. Apply the latest Supabase SQL first.' : null);
    } else {
      setCollaborators((data ?? []) as CollaboratorRecord[]);
      setError(null);
    }
    setLoading(false);
  }, [isAdminSession, projectId]);

  useEffect(() => {
    void fetchCollaborators();
  }, [fetchCollaborators]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const profile = parseGithubProfile(githubProfile);
    if (!name.trim() || !profile) {
      setError('Add a name and a valid GitHub profile URL or username.');
      return;
    }

    setSaving(true);
    setError(null);
    const nextOrder = collaborators.reduce((highest, item) => Math.max(highest, item.order_index), -1) + 1;
    const { error: insertError } = await supabase.from('project_collaborators').insert({
      project_id: projectId,
      name: name.trim(),
      github_url: profile.url,
      order_index: nextOrder,
    });

    if (insertError) {
      setError('Could not add this collaborator.');
    } else {
      setName('');
      setGithubProfile('');
      await fetchCollaborators();
    }
    setSaving(false);
  };

  const handleDelete = async (collaboratorId: string) => {
    const { error: deleteError } = await supabase.from('project_collaborators').delete().eq('id', collaboratorId);
    if (deleteError) {
      setError('Could not remove this collaborator.');
      return;
    }
    await fetchCollaborators();
  };

  if (loading && !isAdminSession) return null;
  if (collaborators.length === 0 && !isAdminSession) return null;

  return (
    <section className="border-t border-ink/10 py-12 md:py-16" aria-labelledby="project-collaborators-title">
      {collaborators.length > 0 && (
        <div>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="terminal-text mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">Built together</p>
              <h2 id="project-collaborators-title" className="font-serif text-3xl text-ink md:text-4xl">
                Collaborators
              </h2>
            </div>
            <Users size={22} className="text-ink-muted" aria-hidden="true" />
          </div>

          <div className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
            {collaborators.map((collaborator) => {
              const profile = parseGithubProfile(collaborator.github_url);
              return (
                <article key={collaborator.id} className="group flex min-w-0 items-center gap-4 bg-cream p-5 md:p-6">
                  <CollaboratorAvatar collaborator={collaborator} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-xl text-ink">{collaborator.name}</h3>
                    <a
                      href={profile?.url ?? collaborator.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
                      data-cursor="pointer"
                    >
                      <Github size={13} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">@{profile?.username ?? 'GitHub profile'}</span>
                    </a>
                  </div>
                  {isAdminSession && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(collaborator.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center border border-ink/15 text-ink-muted opacity-100 transition-colors hover:border-red-300 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                      aria-label={`Remove ${collaborator.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {isAdminSession && (
        <form onSubmit={handleAdd} className={`${collaborators.length > 0 ? 'mt-8' : ''} border border-ink/15 p-5 md:p-6`}>
          <div className="mb-4">
            <p className="terminal-text mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">Admin only</p>
            <h2 className="font-serif text-2xl text-ink">Manage collaborators</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <label>
              <span className="sr-only">Collaborator name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="h-12 w-full border border-ink/20 bg-transparent px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              />
            </label>
            <label>
              <span className="sr-only">GitHub profile URL or username</span>
              <input
                value={githubProfile}
                onChange={(event) => setGithubProfile(event.target.value)}
                placeholder="GitHub URL or username"
                className="h-12 w-full border border-ink/20 bg-transparent px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-xs uppercase tracking-wide text-cream disabled:opacity-60"
              data-cursor="pointer"
            >
              <Plus size={14} aria-hidden="true" /> {saving ? 'Adding…' : 'Add person'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  );
}
