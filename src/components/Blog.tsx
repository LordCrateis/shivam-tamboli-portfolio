import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import FadeUp from './FadeUp';
import { supabase } from '../lib/supabase';

type BlogMode = 'visitor' | 'shivam';

type RouteState =
  | { kind: 'gateway' }
  | { kind: 'list'; mode: BlogMode }
  | { kind: 'detail'; slug: string };

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface EditorState {
  id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
}

const SHIVAM_EDITOR_EMAIL = 'shivamrtamboli62@gmail.com';

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '<p></p>',
  category: 'General',
  published: false,
};

function parseRoute(hashValue: string): RouteState {
  const cleaned = hashValue.replace(/^#\/?/, '');
  const [root, second, ...rest] = cleaned.split('/');

  if (root !== 'blog') {
    return { kind: 'gateway' };
  }

  if (!second) {
    return { kind: 'gateway' };
  }

  if (second === 'visitor') {
    return { kind: 'list', mode: 'visitor' };
  }

  if (second === 'shivam') {
    return { kind: 'list', mode: 'shivam' };
  }

  const slug = [second, ...rest].join('/').trim();
  if (!slug) {
    return { kind: 'gateway' };
  }

  return { kind: 'detail', slug: decodeURIComponent(slug) };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getReadTime(html: string): string {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function sanitizeRichHtml(input: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = input;

  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'code',
    'pre',
    'a',
  ]);

  const cleanNode = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tagName = child.tagName.toLowerCase();

      if (!allowedTags.has(tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const attrName = attr.name.toLowerCase();

        if (tagName === 'a' && ['href', 'target', 'rel'].includes(attrName)) {
          if (attrName === 'href') {
            const hrefValue = attr.value.trim();
            const safeHref =
              hrefValue.startsWith('https://') ||
              hrefValue.startsWith('http://') ||
              hrefValue.startsWith('mailto:') ||
              hrefValue.startsWith('/');

            if (!safeHref) {
              child.removeAttribute(attr.name);
            }
          }
          continue;
        }

        child.removeAttribute(attr.name);
      }

      if (tagName === 'a') {
        child.setAttribute('rel', 'noopener noreferrer');
        child.setAttribute('target', '_blank');
      }

      cleanNode(child);
    }
  };

  cleanNode(wrapper);
  return wrapper.innerHTML;
}

export default function Blog() {
  const currentYear = new Date().getFullYear();
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [hashValue, setHashValue] = useState(window.location.hash || '#/blog');
  const route = useMemo(() => parseRoute(hashValue), [hashValue]);

  const [session, setSession] = useState<Session | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);

  const isShivamSession = session?.user?.email === SHIVAM_EDITOR_EMAIL;

  useEffect(() => {
    const onHashChange = () => setHashValue(window.location.hash || '#/blog');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const nextSession = data.session;
      if (nextSession?.user?.email !== SHIVAM_EDITOR_EMAIL) {
        setSession(null);
        return;
      }
      setSession(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.user?.email !== SHIVAM_EDITOR_EMAIL) {
        setSession(null);
        return;
      }
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== editor.content) {
      contentRef.current.innerHTML = editor.content;
    }
  }, [editor.content]);

  useEffect(() => {
    const load = async () => {
      setBlogError(null);
      setLoading(true);

      if (route.kind === 'list') {
        if (route.mode === 'shivam' && !isShivamSession) {
          setPosts([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('blogs')
          .select('id,title,slug,excerpt,content,category,published,created_at,updated_at')
          .order('created_at', { ascending: false });

        if (route.mode === 'visitor') {
          query = query.eq('published', true);
        }

        const { data, error } = await query;
        if (error) {
          setBlogError(error.message);
          setPosts([]);
        } else {
          setPosts(data ?? []);
        }
      }

      if (route.kind === 'detail') {
        let query = supabase
          .from('blogs')
          .select('id,title,slug,excerpt,content,category,published,created_at,updated_at')
          .eq('slug', route.slug)
          .limit(1)
          .maybeSingle();

        if (!isShivamSession) {
          query = query.eq('published', true);
        }

        const { data, error } = await query;
        if (error) {
          setBlogError(error.message);
          setActivePost(null);
        } else {
          setActivePost(data ?? null);
        }
      }

      setLoading(false);
    };

    void load();
  }, [route, isShivamSession]);

  const openNewEditor = () => {
    setEditor(EMPTY_EDITOR);
  };

  const openEditorForPost = (post: BlogPost) => {
    setEditor({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      published: post.published,
    });
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: SHIVAM_EDITOR_EMAIL,
      password: authPassword,
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.user?.email !== SHIVAM_EDITOR_EMAIL) {
      await supabase.auth.signOut();
      setAuthError('Only the Shivam editor account can access edit mode.');
      return;
    }

    setAuthPassword('');
    setHashValue('#/blog/shivam');
    window.location.hash = '/blog/shivam';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEditor(EMPTY_EDITOR);
    window.location.hash = '/blog';
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setBlogError(null);

    const sanitizedContent = sanitizeRichHtml(editor.content).trim();
    const title = editor.title.trim();
    const slug = slugify(editor.slug || title);

    if (!title || !slug || !sanitizedContent) {
      setSaving(false);
      setBlogError('Title, slug, and content are required.');
      return;
    }

    const payload = {
      title,
      slug,
      excerpt: editor.excerpt.trim(),
      content: sanitizedContent,
      category: editor.category.trim() || 'General',
      published: editor.published,
      updated_at: new Date().toISOString(),
    };

    if (editor.id) {
      const { error } = await supabase.from('blogs').update(payload).eq('id', editor.id);
      if (error) {
        setBlogError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('blogs').insert(payload);
      if (error) {
        setBlogError(error.message);
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('blogs')
      .select('id,title,slug,excerpt,content,category,published,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      setBlogError(error.message);
    } else {
      setPosts(data ?? []);
      setEditor(EMPTY_EDITOR);
    }

    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Delete this blog post? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) {
      setBlogError(error.message);
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== id));
    if (editor.id === id) {
      setEditor(EMPTY_EDITOR);
    }
  };

  const handlePublishToggle = async (post: BlogPost) => {
    const { error } = await supabase
      .from('blogs')
      .update({ published: !post.published, updated_at: new Date().toISOString() })
      .eq('id', post.id);

    if (error) {
      setBlogError(error.message);
      return;
    }

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id ? { ...item, published: !item.published } : item,
      ),
    );
  };

  const runCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const latestContent = contentRef.current?.innerHTML ?? '';
    setEditor((prev) => ({ ...prev, content: latestContent }));
  };

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
        <p className="font-sans text-base md:text-lg text-ink-muted max-w-2xl leading-relaxed mb-12">
          Essays, build logs, and machine learning notes — now powered by your Supabase backend.
        </p>
      </FadeUp>

      {route.kind === 'gateway' && (
        <FadeUp delay={0.2}>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <button
              onClick={() => {
                window.location.hash = '/blog/visitor';
              }}
              className="text-left border border-ink/15 p-6 hover:border-ink/40 transition-colors"
              data-cursor="pointer"
            >
              <p className="terminal-text text-xs text-ink-muted uppercase mb-3">Read only</p>
              <h2 className="font-serif text-3xl text-ink mb-3">Visitor</h2>
              <p className="font-sans text-sm text-ink-muted leading-relaxed">
                Browse published posts only. No editing controls are shown.
              </p>
            </button>

            <button
              onClick={() => {
                window.location.hash = '/blog/shivam';
              }}
              className="text-left border border-ink/15 p-6 hover:border-ink/40 transition-colors"
              data-cursor="pointer"
            >
              <p className="terminal-text text-xs text-ink-muted uppercase mb-3">Editor access</p>
              <h2 className="font-serif text-3xl text-ink mb-3">Shivam</h2>
              <p className="font-sans text-sm text-ink-muted leading-relaxed">
                Login first, then add, edit, delete, and publish or draft blogs.
              </p>
            </button>
          </div>
        </FadeUp>
      )}

      {route.kind === 'list' && route.mode === 'shivam' && !isShivamSession && (
        <FadeUp delay={0.2}>
          <form onSubmit={handleLogin} className="max-w-md border border-ink/15 p-6 space-y-4">
            <p className="terminal-text text-xs text-ink-muted uppercase">Shivam editor login</p>
            <h2 className="font-serif text-3xl text-ink">Enter password</h2>
            <p className="font-sans text-sm text-ink-muted">
              Continue as {SHIVAM_EDITOR_EMAIL} to unlock editor controls.
            </p>
            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm text-ink outline-none"
              placeholder="Password"
              required
            />
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <button
              type="submit"
              className="bg-ink text-cream px-4 py-2 text-xs uppercase tracking-wide"
              data-cursor="pointer"
            >
              Login
            </button>
          </form>
        </FadeUp>
      )}

      {route.kind === 'list' && (route.mode === 'visitor' || isShivamSession) && (
        <>
          {route.mode === 'shivam' && isShivamSession && (
            <FadeUp delay={0.2}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border border-ink/15 p-4">
                <p className="terminal-text text-xs text-ink-muted uppercase">
                  Shivam mode active — full editor access
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openNewEditor}
                    className="inline-flex items-center gap-2 bg-ink text-cream px-3 py-2 text-xs uppercase tracking-wide"
                    data-cursor="pointer"
                  >
                    <Plus size={14} />
                    New Post
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink"
                    data-cursor="pointer"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            </FadeUp>
          )}

          {route.mode === 'shivam' && isShivamSession && (
            <FadeUp delay={0.22}>
              <form onSubmit={handleSave} className="border border-ink/15 p-6 mb-12 space-y-4">
                <h3 className="font-serif text-2xl text-ink">
                  {editor.id ? 'Edit Post' : 'Create Post'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={editor.title}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Title"
                    className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                    required
                  />
                  <input
                    value={editor.slug}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, slug: event.target.value }))
                    }
                    placeholder="Slug (optional, auto-generated from title)"
                    className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={editor.category}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="Category"
                    className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  />
                  <label className="flex items-center gap-2 border border-ink/20 px-4 py-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={editor.published}
                      onChange={(event) =>
                        setEditor((prev) => ({ ...prev, published: event.target.checked }))
                      }
                    />
                    Published
                  </label>
                </div>

                <textarea
                  value={editor.excerpt}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, excerpt: event.target.value }))
                  }
                  placeholder="Excerpt"
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none min-h-24"
                />

                <div className="border border-ink/20">
                  <div className="flex flex-wrap gap-2 border-b border-ink/15 p-3">
                    <button
                      type="button"
                      onClick={() => runCommand('bold')}
                      className="border border-ink/20 px-2 py-1 text-xs"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => runCommand('italic')}
                      className="border border-ink/20 px-2 py-1 text-xs"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => runCommand('insertUnorderedList')}
                      className="border border-ink/20 px-2 py-1 text-xs"
                    >
                      Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() => runCommand('insertOrderedList')}
                      className="border border-ink/20 px-2 py-1 text-xs"
                    >
                      Numbered List
                    </button>
                  </div>
                  <div
                    ref={contentRef}
                    contentEditable
                    className="min-h-52 p-4 outline-none text-sm leading-relaxed"
                    onInput={(event) =>
                      setEditor((prev) => ({
                        ...prev,
                        content: (event.target as HTMLDivElement).innerHTML,
                      }))
                    }
                    suppressContentEditableWarning
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-ink text-cream px-4 py-2 text-xs uppercase tracking-wide disabled:opacity-60"
                    data-cursor="pointer"
                  >
                    {saving ? 'Saving…' : editor.id ? 'Update Post' : 'Publish Post'}
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
            </FadeUp>
          )}

          {loading && <p className="text-sm text-ink-muted">Loading posts…</p>}
          {blogError && <p className="text-sm text-red-600 mb-4">{blogError}</p>}

          <div className="border-t border-ink/10 divide-y divide-ink/10">
            {posts.map((post, idx) => (
              <FadeUp key={post.id} delay={0.18 + idx * 0.04}>
                <article className="py-8">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
                    <p className="terminal-text text-xs text-ink-muted shrink-0 w-8 mt-1">
                      {String(idx + 1).padStart(2, '0')}
                    </p>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                        <span className="terminal-text text-xs text-ink-muted">
                          {formatDate(post.created_at)}
                        </span>
                        <span className="terminal-text text-xs text-ink-muted">
                          {getReadTime(post.content)}
                        </span>
                        <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                          {post.category || 'General'}
                        </span>
                        {!post.published && (
                          <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                            Draft
                          </span>
                        )}
                      </div>

                      <a
                        href={`#/blog/${encodeURIComponent(post.slug)}`}
                        className="font-serif text-2xl md:text-3xl text-ink mb-3 inline-block hover:opacity-70 transition-opacity"
                        data-cursor="pointer"
                      >
                        {post.title}
                      </a>

                      <p className="font-sans text-sm md:text-base text-ink-muted leading-relaxed max-w-3xl">
                        {post.excerpt || 'No excerpt provided.'}
                      </p>

                      {route.mode === 'shivam' && isShivamSession && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openEditorForPost(post)}
                            className="inline-flex items-center gap-1 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handlePublishToggle(post)}
                            className="border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            {post.published ? 'Mark Draft' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="inline-flex items-center gap-1 border border-red-300 text-red-600 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <ArrowUpRight size={18} className="text-ink-muted lg:mt-1 shrink-0" />
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
        </>
      )}

      {route.kind === 'detail' && (
        <FadeUp delay={0.2}>
          {loading && <p className="text-sm text-ink-muted">Loading post…</p>}
          {blogError && <p className="text-sm text-red-600">{blogError}</p>}

          {!loading && !activePost && !blogError && (
            <p className="text-sm text-ink-muted">This post is unavailable.</p>
          )}

          {activePost && (
            <article className="max-w-4xl">
              <p className="terminal-text text-xs text-ink-muted uppercase mb-4">
                {activePost.category || 'General'}
              </p>
              <h2 className="font-serif text-4xl md:text-6xl text-ink leading-tight mb-4">
                {activePost.title}
              </h2>
              <p className="terminal-text text-xs text-ink-muted mb-10">
                {formatDate(activePost.created_at)} · {getReadTime(activePost.content)}
              </p>

              <div
                className="font-sans text-base md:text-lg text-ink leading-relaxed space-y-4 [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(activePost.content),
                }}
              />

              <div className="mt-12">
                <a
                  href="#/blog/visitor"
                  className="terminal-text text-xs text-ink-muted hover:text-ink uppercase"
                  data-cursor="pointer"
                >
                  ← Back to blog list
                </a>
              </div>
            </article>
          )}
        </FadeUp>
      )}
    </section>
  );
}
